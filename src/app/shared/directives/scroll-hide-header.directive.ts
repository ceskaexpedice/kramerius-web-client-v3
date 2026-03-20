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

    private getHeaderHeight(): number {
        const headerEl = document.querySelector('app-header');
        return headerEl ? headerEl.getBoundingClientRect().height : 0;
    }

    ngOnInit() {
        this.zone.runOutsideAngular(() => {
            const elScroll$ = fromEvent(this.el.nativeElement, 'scroll');
            const windowScroll$ = fromEvent(window, 'scroll');

            this.scrollSub = merge(elScroll$, windowScroll$).pipe(
                throttleTime(10, undefined, { leading: true, trailing: true }),
                map(() => {
                    const el = this.el.nativeElement;
                    const elTop = el.scrollTop;
                    const winTop = window.scrollY || document.documentElement.scrollTop || 0;
                    // Check if content would overflow even with header hidden (extra space).
                    // This prevents the loop: hide header → more space → no overflow → show header → less space → overflow → hide...
                    const headerHeight = this.getHeaderHeight();
                    const availableWithHeaderHidden = el.clientHeight + headerHeight;
                    const hasOverflow = el.scrollHeight > availableWithHeaderHidden + this.SCROLL_THRESHOLD;
                    return { scrollTop: Math.max(elTop, winTop), hasOverflow };
                }),
                pairwise(),
                filter(([prev, curr]) => {
                    if (!curr.hasOverflow) return prev.hasOverflow !== curr.hasOverflow;
                    return Math.abs(prev.scrollTop - curr.scrollTop) > this.SCROLL_THRESHOLD;
                }),
                map(([prev, curr]) => {
                    // If content doesn't overflow even with header hidden, always show
                    if (!curr.hasOverflow) return true;
                    // If at top (or near top), always show
                    if (curr.scrollTop < 50) return true;
                    // If scrolling down (curr > prev), hide. If scrolling up, show.
                    return curr.scrollTop < prev.scrollTop;
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
