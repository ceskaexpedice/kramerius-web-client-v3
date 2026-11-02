import { DOCUMENT } from '@angular/common';
import { Directive, ElementRef, Injector, OnDestroy, OnInit, NgZone, afterNextRender, effect, inject, input, untracked } from '@angular/core';
import { UiStateService } from '../services/ui-state.service';
import { Subscription, fromEvent, merge } from 'rxjs';
import { filter, map } from 'rxjs/operators';

/** Layout box of an element, ignoring transforms (offset* based). */
interface LayoutBox {
    top: number;
    bottom: number;
    left: number;
    right: number;
}

/** Inline properties the overlay sets on the host; removed again on teardown. */
const HOST_PROPS = [
    'position', 'top', 'bottom', 'left', 'width', 'height', 'min-height', 'max-height',
    'margin', 'flex', 'box-sizing', 'padding-top', 'padding-bottom',
    'scroll-padding-top', 'scroll-padding-bottom', '--scroll-hide-sticky-top'
] as const;

/**
 * Slides the app header and the page toolbars above the host (a scroll
 * container) away while it scrolls down, and back while it scrolls up.
 *
 * Overlay: while enabled, the host is taken out of flow and spans the whole
 * screen, starting under the bars above it ("chrome") and padded by their
 * height, so the content starts where it did. Hiding then only translates the
 * chrome; the layout never changes, so the list keeps moving 1:1 with the
 * finger instead of jumping up by the chrome height mid-scroll.
 *
 * A bar that should stay pinned while the rest leaves carries
 * `data-scroll-hide-keep` (it ends at the screen top). Sticky elements inside
 * the host stick below the visible chrome with `top: var(--scroll-hide-sticky-top)`.
 */
@Directive({
    selector: '[appScrollHideHeader]',
    standalone: true
})
export class ScrollHideHeaderDirective implements OnInit, OnDestroy {
    /** The instance whose overlay currently owns the shared state (body var, header). */
    private static owner: ScrollHideHeaderDirective | null = null;

    private el = inject(ElementRef);
    private uiState = inject(UiStateService);
    private zone = inject(NgZone);
    private document = inject(DOCUMENT);
    private injector = inject(Injector);
    private scrollSub: Subscription | null = null;

    /**
     * Optional on/off switch. A bare `appScrollHideHeader` attribute keeps the
     * original always-on behaviour; bind `false` to pin the header (e.g. only
     * hide it on phones, where vertical space is scarce).
     */
    readonly enabled = input(true, {
        alias: 'appScrollHideHeader',
        transform: (value: boolean | '') => value !== false,
    });

    private lastScrollTop = 0;
    // The header starts out shown: the first scroll near the top must not count
    // as a toggle (it would start the cooldown and delay the first hide).
    private lastDirection: boolean | null = true;
    private cooldownUntil = 0;

    private directionAnchor = 0;
    private currentDirection: boolean | null = null;

    // Damps flapping on a jittery reverse. The slide is a pure transform (no
    // layout change feeding back into scrollTop), so it can be short.
    private readonly COOLDOWN_MS = 150;
    private readonly DIRECTION_THRESHOLD = 40;

    // Overlay state
    private active = false;
    private chrome: HTMLElement[] = [];
    /** Ancestors of the chrome whose overflow would clip the bars as they slide up. */
    private unclipped: HTMLElement[] = [];
    /** The host's own inline values of HOST_PROPS, put back on teardown. */
    private savedInline: [string, string, string][] = [];
    /** Host padding before the overlay added the chrome / bottom bar insets. */
    private basePadTop = 0;
    private basePadBottom = 0;
    /** Gap between the chrome bottom and the host's natural top (page padding). */
    private topGap = 0;
    /** Height reserved for fixed bottom bars (nav bar, mini-player) under the host's natural bottom. */
    private bottomInset = 0;
    /**
     * Distance from the host's natural bottom up from its layout parent's
     * bottom, to follow that bottom when the page around it resizes (e.g. the
     * mini-player appears); null when the parent collapsed without the host.
     */
    private parentBottomGap: number | null = null;
    /** Natural top of the host = height of everything above it. */
    private chromeHeight = 0;
    /** How far the chrome slides up when hidden. */
    private hideDistance = 0;
    private resizeObserver: ResizeObserver | null = null;
    private readonly onWindowResize = () => this.zone.runOutsideAngular(() => this.remeasure());
    private readonly onFocusIn = (event: FocusEvent) => this.revealFocusedChrome(event);

    constructor() {
        // Switched off while hidden (e.g. rotated from phone to tablet): bring
        // the header back instead of leaving it stranded off-screen.
        effect(() => {
            const enabled = this.enabled();
            untracked(() => {
                if (enabled) {
                    // The page around the host (toolbars) must be laid out first.
                    afterNextRender({ write: () => this.activate() }, { injector: this.injector });
                } else {
                    this.lastDirection = true;
                    this.uiState.setHeaderVisibility(true);
                    this.deactivate();
                }
            });
        });

        effect(() => {
            const visible = this.uiState.headerVisible();
            untracked(() => this.applyInset(visible));
        });
    }

    ngOnInit() {
        this.zone.runOutsideAngular(() => {
            const el = this.el.nativeElement as HTMLElement;
            const elScroll$ = fromEvent(el, 'scroll', { passive: true });
            const windowScroll$ = fromEvent(window, 'scroll', { passive: true });

            this.lastScrollTop = el.scrollTop > 0 ? el.scrollTop : (window.scrollY || 0);
            this.directionAnchor = this.lastScrollTop;

            // No throttling: scroll fires at most once a frame and the check is
            // cheap, while a trailing throttle made the bars react late.
            this.scrollSub = merge(elScroll$, windowScroll$).pipe(
                filter(() => Date.now() >= this.cooldownUntil),
                filter(() => this.enabled()),
                map(() => {
                    const elTop = el.scrollTop;
                    const winTop = window.scrollY || 0;
                    const scrollTop = elTop > 0 ? elTop : winTop;

                    const delta = scrollTop - this.lastScrollTop;
                    this.lastScrollTop = scrollTop;

                    if (scrollTop < 50) {
                        this.directionAnchor = scrollTop;
                        this.currentDirection = true;
                        return true;
                    }

                    // Every event counts (a slow drag moves ~1px a frame); the
                    // distance threshold below absorbs jitter.
                    if (delta === 0) return this.lastDirection ?? true;

                    const goingUp = delta < 0;

                    // Anchor where the new direction started (the previous sample),
                    // so the travel within this first sample counts too.
                    if (this.currentDirection !== goingUp) {
                        this.currentDirection = goingUp;
                        this.directionAnchor = scrollTop - delta;
                    }

                    const distanceFromAnchor = Math.abs(scrollTop - this.directionAnchor);
                    if (distanceFromAnchor < this.DIRECTION_THRESHOLD) {
                        return this.lastDirection ?? true;
                    }

                    return goingUp;
                }),
                // Dedupe against lastDirection rather than distinctUntilChanged(),
                // so the disable effect can reset it.
                filter(shouldShow => shouldShow !== this.lastDirection)
            ).subscribe((shouldShow) => {
                this.lastDirection = shouldShow;
                this.cooldownUntil = Date.now() + this.COOLDOWN_MS;

                // Bars may have been added or resized since the last toggle.
                if (!shouldShow) {
                    this.updateChrome();
                }

                this.zone.run(() => {
                    this.uiState.setHeaderVisibility(shouldShow);
                });

                // Reset tracking after toggle
                this.lastScrollTop = el.scrollTop;
                this.directionAnchor = el.scrollTop;
            });
        });
    }

    ngOnDestroy() {
        this.scrollSub?.unsubscribe();
        this.deactivate();
        this.uiState.setHeaderVisibility(true);
    }

    private get host(): HTMLElement {
        return this.el.nativeElement as HTMLElement;
    }

    /** Takes the host out of flow under the chrome (see class doc). */
    private activate(): void {
        if (this.active || !this.enabled() || !this.host.isConnected) {
            return;
        }
        const host = this.host;
        const natural = host.getBoundingClientRect();
        const cs = getComputedStyle(host);
        this.basePadTop = parseFloat(cs.paddingTop) || 0;
        this.basePadBottom = parseFloat(cs.paddingBottom) || 0;

        this.chrome = this.collectChrome(natural.left, natural.right);
        const chromeBottom = this.chromeBottom();
        this.topGap = Math.max(0, natural.top - chromeBottom);

        this.savedInline = HOST_PROPS.map(prop => [prop, host.style.getPropertyValue(prop), host.style.getPropertyPriority(prop)]);
        const set = (prop: string, value: string) => host.style.setProperty(prop, value, 'important');
        set('position', 'fixed');
        set('top', '0px');
        // To the screen bottom, under the nav bar and the mini-player: the
        // room they take is measured into bottomInset below. (Not above the
        // player: its height changes as the nav bar slides away.)
        set('bottom', '0px');
        set('left', `${natural.left}px`);
        set('width', `${natural.width}px`);
        set('height', 'auto');
        set('min-height', '0px');
        set('max-height', 'none');
        set('margin', '0px');
        set('flex', 'none');
        set('box-sizing', 'border-box');

        // Fixed bars under the natural bottom (nav bar, mini-player) now overlap
        // the host: reserve their height at the end of the list instead.
        this.bottomInset = Math.max(0, host.getBoundingClientRect().bottom - natural.bottom);
        const parent = this.layoutParent();
        this.parentBottomGap = parent && parent.offsetHeight > 0
            ? this.layoutBox(parent).bottom - (natural.bottom + window.scrollY)
            : null;

        this.active = true;
        ScrollHideHeaderDirective.owner = this;
        this.chrome.forEach(c => c.classList.add('scroll-hide-chrome'));
        this.updateUnclipped();
        this.applyGeometry();

        this.zone.runOutsideAngular(() => {
            this.resizeObserver = new ResizeObserver(() => this.updateChrome());
            this.chrome.forEach(c => this.resizeObserver!.observe(c));
            const layoutParent = this.layoutParent();
            if (layoutParent) {
                this.resizeObserver.observe(layoutParent);
            }
            window.addEventListener('resize', this.onWindowResize, { passive: true });
            this.document.addEventListener('focusin', this.onFocusIn);
        });
    }

    private deactivate(): void {
        if (!this.active) {
            return;
        }
        this.active = false;
        this.resizeObserver?.disconnect();
        this.resizeObserver = null;
        window.removeEventListener('resize', this.onWindowResize);
        this.document.removeEventListener('focusin', this.onFocusIn);

        this.savedInline.forEach(([prop, value, priority]) => value
            ? this.host.style.setProperty(prop, value, priority)
            : this.host.style.removeProperty(prop));
        this.savedInline = [];

        // The next page's overlay may already share some chrome (app header).
        const next = ScrollHideHeaderDirective.owner !== this ? ScrollHideHeaderDirective.owner : null;
        this.chrome
            .filter(c => !next?.chrome.includes(c))
            .forEach(c => c.classList.remove('scroll-hide-chrome'));
        this.unclipped
            .filter(a => !next?.unclipped.includes(a))
            .forEach(a => a.classList.remove('scroll-hide-unclip'));
        this.chrome = [];
        this.unclipped = [];
        if (!next) {
            ScrollHideHeaderDirective.owner = null;
            this.document.body.style.removeProperty('--scroll-hide-distance');
        }
    }

    /** Viewport size changed: measure the host's natural box afresh. */
    private remeasure(): void {
        if (!this.active) {
            return;
        }
        this.deactivate();
        this.activate();
    }

    /** Re-collects the chrome (bars may come and go) and updates the insets. */
    private updateChrome(): void {
        if (!this.active) {
            return;
        }
        const hostBox = this.layoutBox(this.host);
        const fresh = this.collectChrome(hostBox.left, hostBox.right);
        const added = fresh.filter(c => !this.chrome.includes(c));
        this.chrome.filter(c => !fresh.includes(c)).forEach(c => {
            c.classList.remove('scroll-hide-chrome');
            this.resizeObserver?.unobserve(c);
        });
        added.forEach(c => {
            c.classList.add('scroll-hide-chrome');
            this.resizeObserver?.observe(c);
        });
        this.chrome = fresh;
        this.updateUnclipped();
        this.updateBottomInset();
        this.applyGeometry();
    }

    /** The page's bottom bars changed (mini-player shown or hidden): follow them. */
    private updateBottomInset(): void {
        const parent = this.layoutParent();
        if (this.parentBottomGap === null || !parent || parent.offsetHeight <= 0) {
            return;
        }
        const naturalBottom = this.layoutBox(parent).bottom - this.parentBottomGap;
        this.bottomInset = Math.max(0, this.layoutBox(this.host).bottom - naturalBottom);
    }

    /**
     * Page wrappers clip their overflow, which would cut the bars off at the top
     * of `main` as they slide up (a kept bar would vanish outright). Let them
     * overflow vertically while the overlay is on.
     */
    private updateUnclipped(): void {
        const next = new Set<HTMLElement>();
        this.chrome.forEach(c => {
            for (let a = c.parentElement; a && a !== this.document.body; a = a.parentElement) {
                if (next.has(a)) {
                    break;
                }
                const cs = getComputedStyle(a);
                if (a.classList.contains('scroll-hide-unclip') || cs.overflowY === 'hidden' || cs.overflowY === 'clip') {
                    next.add(a);
                }
            }
        });
        this.unclipped.filter(a => !next.has(a)).forEach(a => a.classList.remove('scroll-hide-unclip'));
        next.forEach(a => a.classList.add('scroll-hide-unclip'));
        this.unclipped = Array.from(next);
    }

    private applyGeometry(): void {
        const host = this.host;
        const chromeBottom = this.chromeBottom();
        this.chromeHeight = chromeBottom + this.topGap;

        // Bars marked to stay end at the screen top; everything above them leaves.
        const kept = this.chrome.filter(c => c.hasAttribute('data-scroll-hide-keep'));
        this.hideDistance = kept.length
            ? Math.min(...kept.map(c => this.layoutBox(c).top))
            : this.chromeHeight;

        host.style.setProperty('padding-top', `${this.basePadTop + this.chromeHeight}px`, 'important');
        host.style.setProperty('padding-bottom', `${this.basePadBottom + this.bottomInset}px`, 'important');
        host.style.setProperty('scroll-padding-bottom', `${this.bottomInset}px`, 'important');
        this.document.body.style.setProperty('--scroll-hide-distance', `${this.hideDistance}px`);
        this.applyInset(this.uiState.headerVisible());
    }

    /** Space the visible chrome takes at the top (for sticky children and focus scrolling). */
    private applyInset(visible: boolean): void {
        if (!this.active) {
            return;
        }
        const inset = visible ? this.chromeHeight : this.chromeHeight - this.hideDistance;
        // Sticky offsets count from the padding edge, which already clears the chrome.
        this.host.style.setProperty('--scroll-hide-sticky-top', `${inset - this.chromeHeight}px`);
        this.host.style.setProperty('scroll-padding-top', `${inset}px`, 'important');
    }

    /**
     * Elements laid out above the host: earlier siblings of the host and of each
     * of its ancestors, unless they sit beside it (flex row, or no horizontal
     * overlap: side columns). Structural, so it also holds once the host is out
     * of flow and while bars render late.
     */
    private collectChrome(hostLeft: number, hostRight: number): HTMLElement[] {
        const result: HTMLElement[] = [];
        const consider = (el: Element) => {
            if (!(el instanceof HTMLElement)) {
                return;
            }
            const cs = getComputedStyle(el);
            if (cs.display === 'contents') {
                Array.from(el.children).forEach(consider);
                return;
            }
            if (cs.display === 'none' || cs.position === 'fixed' || cs.position === 'absolute') {
                return;
            }
            const b = this.layoutBox(el);
            if (b.bottom - b.top <= 0 || b.right <= hostLeft || b.left >= hostRight) {
                return;
            }
            result.push(el);
        };
        let node: HTMLElement | null = this.host;
        while (node && node !== this.document.body) {
            // Out of flow: nothing outside it is laid out above it.
            if (node !== this.host && /^(fixed|absolute)$/.test(getComputedStyle(node).position)) {
                break;
            }
            const parent: HTMLElement | null = node.parentElement;
            const pcs = parent ? getComputedStyle(parent) : null;
            const beside = !!pcs && pcs.display.includes('flex') && pcs.flexDirection.startsWith('row');
            if (!beside) {
                for (let sib = node.previousElementSibling; sib; sib = sib.previousElementSibling) {
                    consider(sib);
                }
            }
            node = parent;
        }
        return result;
    }

    private chromeBottom(): number {
        return this.chrome.reduce((max, c) => Math.max(max, this.layoutBox(c).bottom), 0);
    }

    /** Page coordinates from the offset chain: unaffected by the slide transform. */
    private layoutBox(el: HTMLElement): LayoutBox {
        let top = 0;
        let left = 0;
        for (let e: HTMLElement | null = el; e; e = e.offsetParent as HTMLElement | null) {
            top += e.offsetTop;
            left += e.offsetLeft;
        }
        return { top, left, bottom: top + el.offsetHeight, right: left + el.offsetWidth };
    }

    /** Nearest ancestor that has a box (skips `display: contents` wrappers). */
    private layoutParent(): HTMLElement | null {
        let parent = this.host.parentElement;
        while (parent && getComputedStyle(parent).display === 'contents') {
            parent = parent.parentElement;
        }
        return parent;
    }

    /** Keyboard focus landed in a bar that slid away: bring the bars back. */
    private revealFocusedChrome(event: FocusEvent): void {
        const target = event.target;
        if (this.uiState.headerVisible() || !(target instanceof Node)) {
            return;
        }
        if (this.chrome.some(c => c.contains(target) && !c.hasAttribute('data-scroll-hide-keep'))) {
            this.lastDirection = true;
            this.zone.run(() => this.uiState.setHeaderVisibility(true));
        }
    }
}
