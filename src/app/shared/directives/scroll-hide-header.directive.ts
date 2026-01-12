import { Directive, ElementRef, OnDestroy, OnInit, NgZone, inject } from '@angular/core';
import { UiStateService } from '../services/ui-state.service';
import { Subscription, fromEvent, merge } from 'rxjs';
import { filter, map, pairwise, throttleTime } from 'rxjs/operators';

@Directive({
    selector: '[appScrollHideHeader]',
    standalone: true
})
export class ScrollHideHeaderDirective implements OnInit, OnDestroy {
    private el = inject(ElementRef);
    private uiState = inject(UiStateService);
    private zone = inject(NgZone);
    private scrollSub: Subscription | null = null;
    private readonly SCROLL_THRESHOLD = 20;

    ngOnInit() {
        this.zone.runOutsideAngular(() => {
            const elScroll$ = fromEvent(this.el.nativeElement, 'scroll');
            const windowScroll$ = fromEvent(window, 'scroll');

            this.scrollSub = merge(elScroll$, windowScroll$).pipe(
                throttleTime(10, undefined, { leading: true, trailing: true }),
                map(() => {
                    const elTop = this.el.nativeElement.scrollTop;
                    const winTop = window.scrollY || document.documentElement.scrollTop || 0;
                    return Math.max(elTop, winTop);
                }),
                pairwise(),
                filter(([prev, curr]) => Math.abs(prev - curr) > this.SCROLL_THRESHOLD),
                map(([prev, curr]) => {
                    // If at top (or near top), always show
                    if (curr < 50) return true;
                    // If scrolling down (curr > prev), hide. If scrolling up, show.
                    return curr < prev;
                })
            ).subscribe((shouldShow) => {
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
