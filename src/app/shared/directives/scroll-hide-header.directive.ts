import { Directive, ElementRef, OnDestroy, OnInit, NgZone, inject } from '@angular/core';
import { UiStateService } from '../services/ui-state.service';
import { Subscription, fromEvent } from 'rxjs';
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
            this.scrollSub = fromEvent(this.el.nativeElement, 'scroll').pipe(
                throttleTime(10, undefined, { leading: true, trailing: true }),
                map(() => this.el.nativeElement.scrollTop),
                pairwise(),
                filter(([prev, curr]) => Math.abs(prev - curr) > this.SCROLL_THRESHOLD),
                map(([prev, curr]) => {
                    if (curr < 50) return true;
                    // Fixed: curr > prev means scrolling DOWN (hide), curr < prev means scrolling UP (show)
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
