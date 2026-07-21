import { Directive, ElementRef, EventEmitter, NgZone, OnDestroy, OnInit, Output, inject } from '@angular/core';
import { BreakpointService } from '../services/breakpoint.service';

/**
 * Reader-style immersive chrome toggle.
 *
 * Emits `cleanTap` when the user taps the host without panning or zooming, so
 * the page can show/hide its mobile chrome. A press that moved beyond the
 * threshold or lasted too long is a pan/zoom gesture and is ignored, otherwise
 * the chrome flickers while manipulating the viewer.
 *
 * The emit is deferred by one double-tap window so a double-tap (zoom) does not
 * flip the chrome: the second tap cancels the pending single-tap emit.
 *
 * Listeners are attached in the capture phase so they run before OpenSeadragon
 * consumes pointer events on its canvas, and outside the Angular zone so pans
 * don't trigger change detection on every pointer event.
 */
@Directive({
    selector: '[appViewerTapToggle]',
    standalone: true
})
export class ViewerTapToggleDirective implements OnInit, OnDestroy {
    /** Fires on a clean single tap, already re-entered into the Angular zone. */
    @Output() cleanTap = new EventEmitter<void>();

    private el = inject(ElementRef<HTMLElement>);
    private zone = inject(NgZone);
    private breakpointService = inject(BreakpointService);

    private static readonly TAP_MOVE_THRESHOLD = 10; // px
    private static readonly TAP_TIME_THRESHOLD = 300; // ms
    private static readonly DOUBLE_TAP_WINDOW = 300; // ms

    private tapStartX = 0;
    private tapStartY = 0;
    private tapStartTime = 0;
    private pendingTapToggle: ReturnType<typeof setTimeout> | null = null;
    private lastTapUpTime = 0;

    ngOnInit(): void {
        this.zone.runOutsideAngular(() => {
            const el = this.el.nativeElement as HTMLElement;
            el.addEventListener('pointerdown', this.onPointerDown, { capture: true });
            el.addEventListener('pointerup', this.onPointerUp, { capture: true });
        });
    }

    ngOnDestroy(): void {
        const el = this.el.nativeElement as HTMLElement;
        el.removeEventListener('pointerdown', this.onPointerDown, { capture: true } as EventListenerOptions);
        el.removeEventListener('pointerup', this.onPointerUp, { capture: true } as EventListenerOptions);
        if (this.pendingTapToggle !== null) {
            clearTimeout(this.pendingTapToggle);
            this.pendingTapToggle = null;
        }
    }

    /** Record where a pointer press started, to discriminate tap from drag. */
    private onPointerDown = (event: PointerEvent): void => {
        this.tapStartX = event.clientX;
        this.tapStartY = event.clientY;
        this.tapStartTime = event.timeStamp;
    };

    private onPointerUp = (event: PointerEvent): void => {
        if (!this.breakpointService.isMobile()) return;

        const movedX = Math.abs(event.clientX - this.tapStartX);
        const movedY = Math.abs(event.clientY - this.tapStartY);
        const elapsed = event.timeStamp - this.tapStartTime;

        const isCleanTap =
            movedX <= ViewerTapToggleDirective.TAP_MOVE_THRESHOLD &&
            movedY <= ViewerTapToggleDirective.TAP_MOVE_THRESHOLD &&
            elapsed <= ViewerTapToggleDirective.TAP_TIME_THRESHOLD;

        if (!isCleanTap) return;

        // A second tap within the double-tap window cancels the pending emit
        // (this tap is part of a double-tap-to-zoom, not a chrome toggle).
        if (this.pendingTapToggle !== null &&
            event.timeStamp - this.lastTapUpTime <= ViewerTapToggleDirective.DOUBLE_TAP_WINDOW) {
            clearTimeout(this.pendingTapToggle);
            this.pendingTapToggle = null;
            this.lastTapUpTime = 0;
            return;
        }

        this.lastTapUpTime = event.timeStamp;
        this.pendingTapToggle = setTimeout(() => {
            this.pendingTapToggle = null;
            // Listeners run outside Angular; re-enter so the emit triggers
            // change detection for whatever the consumer updates.
            this.zone.run(() => this.cleanTap.emit());
        }, ViewerTapToggleDirective.DOUBLE_TAP_WINDOW);
    };
}
