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

    private directionAnchor = 0;
    private currentDirection: boolean | null = null;

    // Must exceed the CSS transition duration (300ms)
    private readonly COOLDOWN_MS = 400;
    private readonly DIRECTION_THRESHOLD = 40;

    ngOnInit() {
        this.zone.runOutsideAngular(() => {
            const el = this.el.nativeElement as HTMLElement;
            const elScroll$ = fromEvent(el, 'scroll', { passive: true });
            const windowScroll$ = fromEvent(window, 'scroll', { passive: true });

            this.lastScrollTop = el.scrollTop > 0 ? el.scrollTop : (window.scrollY || 0);
            this.directionAnchor = this.lastScrollTop;

            this.scrollSub = merge(elScroll$, windowScroll$).pipe(
                throttleTime(60, undefined, { leading: false, trailing: true }),
                filter(() => Date.now() >= this.cooldownUntil),
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

                    if (Math.abs(delta) < 2) return this.lastDirection ?? true;

                    const goingUp = delta < 0;

                    if (this.currentDirection !== null && goingUp !== this.currentDirection) {
                        this.directionAnchor = scrollTop;
                        this.currentDirection = goingUp;
                    } else if (this.currentDirection === null) {
                        this.currentDirection = goingUp;
                        this.directionAnchor = scrollTop;
                    }

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
        this.uiState.setHeaderVisibility(true);
    }
}
