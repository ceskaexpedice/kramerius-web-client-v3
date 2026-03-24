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

    // Must exceed the CSS transition duration (300ms) to avoid reflow-triggered loops
    private readonly COOLDOWN_MS = 400;

    ngOnInit() {
        this.zone.runOutsideAngular(() => {
            const el = this.el.nativeElement as HTMLElement;
            const elScroll$ = fromEvent(el, 'scroll', { passive: true });
            const windowScroll$ = fromEvent(window, 'scroll', { passive: true });

            // Capture initial position
            this.lastScrollTop = el.scrollTop > 0 ? el.scrollTop : (window.scrollY || 0);

            this.scrollSub = merge(elScroll$, windowScroll$).pipe(
                throttleTime(80, undefined, { leading: false, trailing: true }),
                // Drop events during cooldown (header CSS transition in progress)
                filter(() => Date.now() >= this.cooldownUntil),
                map(() => {
                    const elTop = el.scrollTop;
                    const winTop = window.scrollY || 0;
                    const scrollTop = elTop > 0 ? elTop : winTop;

                    const delta = scrollTop - this.lastScrollTop;
                    this.lastScrollTop = scrollTop;

                    // Near the top — always show
                    if (scrollTop < 50) return true;

                    // Ignore tiny movements (sub-pixel noise, touch inertia)
                    if (Math.abs(delta) < 5) return this.lastDirection ?? true;

                    // Scrolling up → show, scrolling down → hide
                    return delta < 0;
                }),
                distinctUntilChanged()
            ).subscribe((shouldShow) => {
                this.lastDirection = shouldShow;
                // Start cooldown — ignore scroll events caused by the header transition
                this.cooldownUntil = Date.now() + this.COOLDOWN_MS;
                this.zone.run(() => {
                    this.uiState.setHeaderVisibility(shouldShow);
                });
            });
        });
    }

    ngOnDestroy() {
        this.scrollSub?.unsubscribe();
        this.uiState.setHeaderVisibility(true);
    }
}
