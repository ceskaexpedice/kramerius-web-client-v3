import {
  Component,
  EmbeddedViewRef,
  EnvironmentInjector,
  EventEmitter,
  HostListener,
  Injector,
  Input,
  OnDestroy,
  Output,
  afterNextRender,
  effect,
  inject,
  model,
  untracked,
  viewChild
} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { CdkPortal, DomPortalOutlet } from '@angular/cdk/portal';
import { FixedPanelRef, FixedPanelService } from './fixed-panel.service';


/**
 * Non-modal mobile panel filling the free band between the page chrome
 * (see `FixedPanelService`). Rendered into the shared fixed panel container;
 * the header, toolbars and nav bars registered as edges stay interactive.
 */
@Component({
  selector: 'app-fixed-panel',
  standalone: true,
  imports: [CdkPortal],
  templateUrl: './fixed-panel.component.html',
  styleUrl: './fixed-panel.component.scss'
})
export class FixedPanelComponent implements FixedPanelRef, OnDestroy {
  private readonly document = inject(DOCUMENT);
  private readonly injector = inject(Injector);
  private readonly environmentInjector = inject(EnvironmentInjector);
  private readonly service = inject(FixedPanelService);
  /** The panel whose content projects this one; closing it closes this one too. */
  private readonly parent = inject(FixedPanelComponent, { optional: true, skipSelf: true });

  /** Whether the panel is open */
  isOpen = model(false);

  /** Accessible name of the panel region (not rendered). */
  @Input() title = '';

  /** Drops the content padding, for hosts that bring their own (sidebars). */
  @Input() flush = false;

  /** Emitted when the panel is closed */
  @Output() closed = new EventEmitter<void>();

  private readonly portal = viewChild.required(CdkPortal);
  private outlet: DomPortalOutlet | null = null;
  private panelEl: HTMLElement | null = null;
  private focusOrigin: Element | null = null;

  /** The `.fixed-panel` element inside the container (set while attached). */
  get element(): HTMLElement {
    return this.panelEl!;
  }

  constructor() {
    effect(() => {
      const open = this.isOpen();
      untracked(() => (open ? this.attach() : this.detach(true)));
    });

    const parent = this.parent;
    if (parent) {
      effect(() => {
        if (!parent.isOpen() && untracked(this.isOpen)) {
          this.close();
        }
      });
    }
  }

  close(): void {
    this.isOpen.set(false);
    this.closed.emit();
  }

  @HostListener('document:keydown.escape', ['$event'])
  onEscape(event: Event): void {
    // Every open panel listens; only the top one reacts, and only once per key press.
    if (event.defaultPrevented || !this.outlet?.hasAttached() || !this.service.isTop(this)) {
      return;
    }
    if (this.isMeantForAnotherPopup(event.target)) {
      return;
    }
    event.preventDefault();
    this.close();
  }

  /**
   * Escape pressed in a modal dialog, or in a toolbar / header that has a popup
   * open (calendar, select, language picker, mobile menu - all mark their trigger
   * `aria-haspopup` + `aria-expanded`), belongs to that popup; their own handlers
   * don't all `preventDefault()`, so the panel stays open instead of closing along
   * with it. The trigger that opened this panel (expanded because of it) doesn't count.
   */
  private isMeantForAnotherPopup(target: EventTarget | null): boolean {
    if (!(target instanceof Element)) {
      return false;
    }
    if (target.closest('[aria-modal="true"]')) {
      return true;
    }
    const edge = this.service.edgeContaining(target);
    if (!edge) {
      return false;
    }
    return Array.from(edge.querySelectorAll('[aria-haspopup][aria-expanded="true"]'))
      .some(trigger => trigger !== this.focusOrigin);
  }

  ngOnDestroy(): void {
    this.detach(false);
  }

  private attach(): void {
    if (this.outlet?.hasAttached()) {
      return;
    }
    this.focusOrigin = this.document.activeElement;
    this.outlet ??= new DomPortalOutlet(this.service.container);
    const view = this.outlet.attach(this.portal()) as EmbeddedViewRef<unknown>;
    this.panelEl = view.rootNodes.find(
      (node): node is HTMLElement => node instanceof HTMLElement && node.classList.contains('fixed-panel')
    )!;
    this.service.push(this);
    // Switching nav tabs closes one panel and opens another in the same task:
    // the new one should just show its content, not animate in. Checked in a
    // microtask (still before paint) so the close may land on either side.
    const panelEl = this.panelEl;
    panelEl.classList.add('fixed-panel--swap');
    queueMicrotask(() => {
      if (!this.service.closedThisTurn) {
        panelEl.classList.remove('fixed-panel--swap');
      }
    });
    // Focus the panel itself rather than its first tabbable child, so a search
    // field inside doesn't pop the on-screen keyboard the moment it opens.
    this.panelEl.focus({ preventScroll: true });
  }

  /**
   * Removes the panel and returns focus to whatever had it before opening. On a
   * regular close this waits for the next render, when the service has lifted
   * inert from the panel below (where the opener of a nested panel usually lives).
   */
  private detach(deferFocus: boolean): void {
    if (!this.outlet?.hasAttached()) {
      return;
    }
    const active = this.document.activeElement;
    // Focus already moved on (e.g. to an edge toolbar button): leave it there.
    const focusLeftPanel = !!active && active !== this.document.body && !this.panelEl!.contains(active);
    const origin = this.focusOrigin;
    this.focusOrigin = null;

    this.outlet.detach();
    this.service.remove(this);
    this.panelEl = null;

    if (focusLeftPanel) {
      return;
    }
    const restore = () => {
      if (origin instanceof HTMLElement && origin.isConnected) {
        origin.focus({ preventScroll: true });
      } else {
        (this.document.activeElement as HTMLElement | null)?.blur();
      }
    };
    if (deferFocus) {
      afterNextRender({ write: restore }, { injector: this.injector });
    } else {
      // Destroyed while open (e.g. an @if around the panel dropped it on close): the
      // page stays inert until the service's effect runs, so focus the opener after
      // that render, on an injector that outlives this component. Leave focus alone
      // if the opener went away with it (route change).
      afterNextRender({
        write: () => {
          if (origin instanceof HTMLElement && origin.isConnected) {
            origin.focus({ preventScroll: true });
          }
        }
      }, { injector: this.environmentInjector });
    }
  }
}
