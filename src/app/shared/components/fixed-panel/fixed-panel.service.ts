import { DOCUMENT, PlatformLocation } from '@angular/common';
import { DestroyRef, Injectable, Injector, NgZone, Signal, afterNextRender, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationCancel, NavigationEnd, NavigationError, NavigationSkipped, Router } from '@angular/router';
import { UiStateService } from '../../services/ui-state.service';
import { inertOthers } from '../../utils/inert-others';

export type FixedPanelEdgeSide = 'top' | 'bottom';

/** A panel shown in the fixed panel container. */
export interface FixedPanelRef {
  /** The panel's root element inside `FixedPanelService.container`. */
  readonly element: HTMLElement;
  /** Closes the panel as if the user dismissed it. */
  close(): void;
}

interface FixedPanelEdge {
  readonly el: HTMLElement;
  readonly side: FixedPanelEdgeSide;
}

const BODY_OPEN_CLASS = 'fixed-panel-open';

/**
 * Key in `history.state` holding how many panels were open in that history entry.
 * Entries the service pushes for its panels carry 1..n; any other entry counts as 0.
 */
const HISTORY_LEVEL_KEY = 'fixedPanelLevel';

/**
 * Stack of non-modal fixed panels (mobile replacement of the slide-up bottom sheet).
 *
 * Panels sit between the page chrome registered as edges (header, toolbars on top,
 * nav bars at the bottom), which stay interactive. While any panel is open the rest
 * of the page and every panel but the top one are inert, the header is kept visible
 * and the free space between the edges is published as `--fixed-panel-top` /
 * `--fixed-panel-bottom` on `container`.
 *
 * Every open panel owns a same-URL browser history entry, so the system back
 * (Android back, iOS edge swipe, browser back) closes the top panel instead of
 * leaving the page, and closing a panel by its button drops its entry again.
 */
@Injectable({ providedIn: 'root' })
export class FixedPanelService {
  private readonly document = inject(DOCUMENT);
  private readonly zone = inject(NgZone);
  private readonly uiState = inject(UiStateService);
  private readonly injector = inject(Injector);
  private readonly platformLocation = inject(PlatformLocation);
  private readonly router = inject(Router, { optional: true });

  private readonly stack = signal<FixedPanelRef[]>([]);
  private readonly edges = signal<FixedPanelEdge[]>([]);

  readonly anyOpen: Signal<boolean> = computed(() => this.stack().length > 0);

  private _container: HTMLElement | null = null;
  private undoInert: (() => void) | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private detachListeners: (() => void) | null = null;

  /** Panels asked to close by a back navigation that have not detached yet. */
  private readonly closingOnBack = new Set<FixedPanelRef>();
  /** A `historyGo` of ours whose popstate has not arrived yet. */
  private awaitingOwnPop = false;
  private historySyncScheduled = false;

  /** Lazily created host for panel elements, appended to `document.body`. */
  get container(): HTMLElement {
    if (!this._container) {
      this._container = this.document.createElement('div');
      this._container.className = 'fixed-panel-container';
    }
    if (!this._container.isConnected) {
      this.document.body.appendChild(this._container);
    }
    return this._container;
  }

  constructor() {
    // Page state while panels are open: body class, header shown, inert background.
    effect(() => {
      const stack = this.stack();
      const edges = this.edges();
      this.releaseInert();
      const body = this.document.body;
      if (!stack.length) {
        body.classList.remove(BODY_OPEN_CLASS);
        return;
      }
      body.classList.add(BODY_OPEN_CLASS);
      this.uiState.setImmersive(false);
      this.uiState.setHeaderVisibility(true);
      this.applyInert(stack, edges);
      // The chrome revealed above may not animate (reduced motion, interrupted
      // transition), so re-measure once it has rendered instead of relying on transitionend.
      afterNextRender({ read: () => this.measure() }, { injector: this.injector });
    });

    const stopPopState = this.platformLocation.onPopState(event => this.zone.run(() => this.onPopState(event.state)));
    inject(DestroyRef).onDestroy(() => stopPopState());
    // A router navigation while a panel is open pushes or replaces the panel's
    // history entry; give the panel a fresh one on top once it has settled.
    this.router?.events.pipe(takeUntilDestroyed()).subscribe(event => {
      if (event instanceof NavigationEnd || event instanceof NavigationCancel
        || event instanceof NavigationError || event instanceof NavigationSkipped) {
        this.scheduleHistorySync();
      }
    });

    // Scroll-hide must not tuck the header away while a panel hangs below it.
    effect(() => {
      if (this.anyOpen() && !this.uiState.headerVisible()) {
        this.uiState.setHeaderVisibility(true);
      }
    });
  }

  /** Registers page chrome the panels sit between. Returns the unregister function. */
  registerEdge(el: HTMLElement, side: FixedPanelEdgeSide): () => void {
    const entry: FixedPanelEdge = { el, side };
    this.edges.update(edges => [...edges, entry]);
    this.resizeObserver?.observe(el);
    if (this.anyOpen()) {
      this.measure();
    }
    return () => {
      this.edges.update(edges => edges.filter(e => e !== entry));
      this.resizeObserver?.unobserve(el);
      if (this.anyOpen()) {
        this.measure();
      }
    };
  }

  push(panel: FixedPanelRef): void {
    if (this.stack().includes(panel)) {
      return;
    }
    const wasEmpty = !this.stack().length;
    this.stack.update(stack => [...stack, panel]);
    if (wasEmpty) {
      this.attachListeners();
    }
    this.measure();
    this.scheduleHistorySync();
  }

  /**
   * True for the rest of the task in which a panel closed. A panel opening in
   * the same task replaces it (a nav tab switch), so it skips its entrance.
   */
  get closedThisTurn(): boolean {
    return this.closedInTurn;
  }
  private closedInTurn = false;

  /** Closes the top panel (the toolbar's close button; a nested panel first). */
  closeTop(): void {
    this.stack().at(-1)?.close();
  }

  remove(panel: FixedPanelRef): void {
    if (!this.stack().includes(panel)) {
      return;
    }
    this.closedInTurn = true;
    setTimeout(() => (this.closedInTurn = false));
    this.closingOnBack.delete(panel);
    this.stack.update(stack => stack.filter(p => p !== panel));
    if (!this.stack().length) {
      this.detachListeners?.();
      this.detachListeners = null;
    }
    this.scheduleHistorySync();
  }

  /** Back (or forward) landed on another entry: close the panels it has no room for. */
  private onPopState(state: unknown): void {
    if (this.awaitingOwnPop) {
      this.awaitingOwnPop = false;
      this.scheduleHistorySync();
      return;
    }
    const level = historyLevel(state);
    // Top first; closing is asynchronous (the host's effect detaches the panel).
    for (const panel of this.stack().slice(level).reverse()) {
      if (!this.closingOnBack.has(panel)) {
        this.closingOnBack.add(panel);
        panel.close();
      }
    }
    this.scheduleHistorySync();
  }

  /**
   * Coalesces the stack changes of one task, so a panel swapped for another (nav
   * tab switch) keeps its history entry instead of going back and pushing again.
   */
  private scheduleHistorySync(): void {
    if (this.historySyncScheduled) {
      return;
    }
    this.historySyncScheduled = true;
    queueMicrotask(() => {
      this.historySyncScheduled = false;
      this.syncHistory();
    });
  }

  /** Makes the current history entry's panel level match the open panels. */
  private syncHistory(): void {
    // Our popstate or the router's NavigationEnd/Cancel will sync again; acting
    // mid-navigation would go back over the page being navigated to.
    if (this.awaitingOwnPop || this.router?.currentNavigation()) {
      return;
    }
    const open = this.stack().filter(p => !this.closingOnBack.has(p)).length;
    const level = historyLevel(this.platformLocation.getState());
    if (open > level) {
      const loc = this.platformLocation;
      const url = `${loc.pathname}${loc.search}${loc.hash}`;
      for (let next = level + 1; next <= open; next++) {
        // Keep the router's state (navigationId) so a back to this entry restores the same page.
        const base = loc.getState();
        loc.pushState({ ...(isRecord(base) ? base : {}), [HISTORY_LEVEL_KEY]: next }, '', url);
      }
    } else if (open < level && this.platformLocation.historyGo) {
      // A panel closed by its button (or forward into an entry of a closed panel):
      // drop the entries of the closed panels. Same URL, so the router skips the popstate.
      this.awaitingOwnPop = true;
      this.platformLocation.historyGo(open - level);
    }
  }

  isTop(panel: FixedPanelRef): boolean {
    const stack = this.stack();
    return stack.length > 0 && stack[stack.length - 1] === panel;
  }

  /**
   * Publishes the free viewport band between the edges: `--fixed-panel-top` is the
   * lowest bottom of the visible top edges, `--fixed-panel-bottom` the distance from
   * the highest visible bottom edge to the viewport bottom. Edges with no height or
   * slid out of the viewport (scroll-hide, immersive) don't count.
   */
  measure(): void {
    const viewportHeight = this.document.defaultView?.innerHeight ?? 0;
    let top = 0;
    let bottom = 0;
    for (const { el, side } of this.edges()) {
      const rect = el.getBoundingClientRect();
      if (rect.height <= 0) {
        continue;
      }
      if (side === 'top' && rect.bottom > 0) {
        top = Math.max(top, rect.bottom);
      } else if (side === 'bottom' && rect.top < viewportHeight) {
        bottom = Math.max(bottom, viewportHeight - rect.top);
      }
    }
    const style = this.container.style;
    style.setProperty('--fixed-panel-top', `${Math.round(top)}px`);
    style.setProperty('--fixed-panel-bottom', `${Math.round(bottom)}px`);
  }

  private applyInert(stack: FixedPanelRef[], edges: FixedPanelEdge[]): void {
    const topPanel = stack[stack.length - 1];
    const overlays = Array.from(this.document.querySelectorAll('.cdk-overlay-container'));
    const undoPage = inertOthers([...edges.map(e => e.el), topPanel.element, ...overlays], this.document.body);

    // Lower panels may live outside the container's direct children, so inert them explicitly.
    const lowered: HTMLElement[] = [];
    for (const panel of stack) {
      if (panel !== topPanel && !panel.element.inert) {
        panel.element.inert = true;
        lowered.push(panel.element);
      }
    }

    this.undoInert = () => {
      lowered.forEach(el => (el.inert = false));
      undoPage();
    };
  }

  private releaseInert(): void {
    this.undoInert?.();
    this.undoInert = null;
  }

  /** The registered edge that is `node` or contains it, if any. */
  edgeContaining(node: Node): HTMLElement | null {
    return this.edges().find(({ el }) => el.contains(node))?.el ?? null;
  }

  /** True when `target` is an edge, inside one, or wraps one (e.g. the animated header host). */
  private isEdgeRelated(target: EventTarget | null): boolean {
    if (!(target instanceof Node)) {
      return false;
    }
    return this.edges().some(({ el }) => el === target || el.contains(target) || target.contains(el));
  }

  private attachListeners(): void {
    const win = this.document.defaultView;
    const measure = () => this.measure();
    const measureOnEdgeTransition = (event: Event) => {
      if (this.isEdgeRelated(event.target)) {
        this.measure();
      }
    };
    this.zone.runOutsideAngular(() => {
      win?.addEventListener('resize', measure);
      // Header and toolbars animate back in when a panel opens; re-measure once they settle.
      this.document.addEventListener('transitionend', measureOnEdgeTransition, true);
      this.document.addEventListener('transitioncancel', measureOnEdgeTransition, true);
      if (typeof ResizeObserver !== 'undefined') {
        this.resizeObserver = new ResizeObserver(measure);
        this.edges().forEach(({ el }) => this.resizeObserver!.observe(el));
      }
    });
    this.detachListeners = () => {
      win?.removeEventListener('resize', measure);
      this.document.removeEventListener('transitionend', measureOnEdgeTransition, true);
      this.document.removeEventListener('transitioncancel', measureOnEdgeTransition, true);
      this.resizeObserver?.disconnect();
      this.resizeObserver = null;
    };
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** Number of panels the history entry with `state` was pushed for (0 for other entries). */
function historyLevel(state: unknown): number {
  const level = isRecord(state) ? state[HISTORY_LEVEL_KEY] : undefined;
  return typeof level === 'number' && level > 0 ? level : 0;
}
