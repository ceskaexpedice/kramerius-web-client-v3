import { Directive, ElementRef, OnDestroy, OnInit, NgZone, inject } from '@angular/core';
import { UiStateService } from '../services/ui-state.service';
import { Subscription, fromEvent, merge } from 'rxjs';
import { distinctUntilChanged, filter, map, throttleTime } from 'rxjs/operators';

@Directive({
    selector: '[appScrollHideHeader]',
    standalone: true
})
export class ScrollHideHeaderDirective implements OnInit, OnDestroy {
    private el = inject(ElementRef);
    private uiState = inject(UiStateService);
    private zone = inject(NgZone);
    private scrollSub: Subscription | null = null;

    private lastScrollTop = 0;
    private lastDirection: boolean | null = null;
    private cooldownUntil = 0;

    // Anchor point where the current scroll direction started
    private directionAnchor = 0;
    // Current cumulative direction: true = scrolling up, false = scrolling down
    private currentDirection: boolean | null = null;

    // Must exceed the CSS transition duration (300ms) to avoid reflow-triggered loops
    private readonly COOLDOWN_MS = 400;
    // Minimum scroll distance in one direction before toggling the header
    private readonly DIRECTION_THRESHOLD = 40;

    ngOnInit() {
        this.zone.runOutsideAngular(() => {
            const el = this.el.nativeElement as HTMLElement;
            const elScroll$ = fromEvent(el, 'scroll', { passive: true });
            const windowScroll$ = fromEvent(window, 'scroll', { passive: true });

            // Capture initial position
            this.lastScrollTop = el.scrollTop > 0 ? el.scrollTop : (window.scrollY || 0);
            this.directionAnchor = this.lastScrollTop;

            this.scrollSub = merge(elScroll$, windowScroll$).pipe(
                throttleTime(60, undefined, { leading: false, trailing: true }),
                // Drop events during cooldown (header CSS transition in progress)
                filter(() => Date.now() >= this.cooldownUntil),
                map(() => {
                    const elTop = el.scrollTop;
                    const winTop = window.scrollY || 0;
                    const scrollTop = elTop > 0 ? elTop : winTop;

                    const delta = scrollTop - this.lastScrollTop;
                    this.lastScrollTop = scrollTop;

                    // Near the top — always show
                    if (scrollTop < 50) {
                        this.directionAnchor = scrollTop;
                        this.currentDirection = true;
                        return true;
                    }

                    // Ignore sub-pixel noise
                    if (Math.abs(delta) < 2) return this.lastDirection ?? true;

                    // Determine instantaneous direction: up = true, down = false
                    const goingUp = delta < 0;

                    // If direction reversed, reset the anchor to the current position
                    if (this.currentDirection !== null && goingUp !== this.currentDirection) {
                        this.directionAnchor = scrollTop;
                        this.currentDirection = goingUp;
                    } else if (this.currentDirection === null) {
                        this.currentDirection = goingUp;
                        this.directionAnchor = scrollTop;
                    }

                    // Only toggle after sustained scroll in one direction exceeds threshold
                    const distanceFromAnchor = Math.abs(scrollTop - this.directionAnchor);
                    if (distanceFromAnchor < this.DIRECTION_THRESHOLD) {
                        return this.lastDirection ?? true;
                    }

                    return goingUp;
                }),
                distinctUntilChanged()
            ).subscribe((shouldShow) => {
                this.lastDirection = shouldShow;
                this.cooldownUntil = Date.now() + this.COOLDOWN_MS;

                // Measure filter height before toggle for scroll compensation.
                // The filter's margin-bottom changes instantly (no CSS transition),
                // which shifts the scroll container's top edge. We adjust scrollTop
                // to cancel out that shift so the visible content doesn't jump.
                const filterEl = el.parentElement?.querySelector('.page-content__filters') as HTMLElement | null;
                const filterHeight = filterEl ? filterEl.offsetHeight : 0;

                this.zone.run(() => {
                    this.uiState.setHeaderVisibility(shouldShow);
                });

                // Compensate scroll position for the instant filter collapse/expansion
                if (filterHeight > 0) {
                    // Force browser to apply pending CSS changes
                    void el.offsetHeight;
                    if (!shouldShow) {
                        el.scrollTop += filterHeight;
                    } else {
                        el.scrollTop = Math.max(0, el.scrollTop - filterHeight);
                    }
                }

                // Update tracking so the compensation isn't detected as a scroll event
                this.lastScrollTop = el.scrollTop;
                this.directionAnchor = el.scrollTop;
            });
        });
    }

    ngOnDestroy() {
        this.scrollSub?.unsubscribe();
        this.uiState.setHeaderVisibility(true);
    }
}
