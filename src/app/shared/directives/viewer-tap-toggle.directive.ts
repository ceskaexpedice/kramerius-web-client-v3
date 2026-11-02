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
 *
 * Pointers are tracked by id and their ends are heard on the window: pdf.js
 * re-renders its pages mid-pinch, so a finger's pointerup may never reach the
 * host. A plain counter then stayed above zero and every later tap read as a
 * second finger (no tap ever again). A new primary pointer also starts afresh,
 * in case an end got lost altogether.
 */
@Directive({
    selector: '[appViewerTapToggle]',
    standalone: true
})
export class ViewerTapToggleDirective implements OnInit, OnDestroy {
    /** Fires on a clean single tap, already re-entered into the Angular zone. */
    @Output() cleanTap = new EventEmitter<void>();
    /**
     * Fires once per press when it turns into a pan, a long press or a pinch
     * (second pointer), i.e. the reader started working with the scan. Used to
     * tuck the first-visit chrome away without a timer.
     */
    @Output() gestureStart = new EventEmitter<void>();

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
    /** Pointers pressed on the host and not yet lifted. */
    private pointers = new Set<number>();
    /** The current press involved a second finger (pinch): never a tap. */
    private multiTouch = false;
    private gestureReported = false;

    ngOnInit(): void {
        this.zone.runOutsideAngular(() => {
            const el = this.el.nativeElement as HTMLElement;
            el.addEventListener('pointerdown', this.onPointerDown, { capture: true });
            el.addEventListener('pointermove', this.onPointerMove, { capture: true, passive: true });
            window.addEventListener('pointerup', this.onPointerUp, { capture: true });
            window.addEventListener('pointercancel', this.onPointerCancel, { capture: true });
        });
    }

    ngOnDestroy(): void {
        const el = this.el.nativeElement as HTMLElement;
        el.removeEventListener('pointerdown', this.onPointerDown, { capture: true } as EventListenerOptions);
        el.removeEventListener('pointermove', this.onPointerMove, { capture: true } as EventListenerOptions);
        window.removeEventListener('pointerup', this.onPointerUp, { capture: true } as EventListenerOptions);
        window.removeEventListener('pointercancel', this.onPointerCancel, { capture: true } as EventListenerOptions);
        if (this.pendingTapToggle !== null) {
            clearTimeout(this.pendingTapToggle);
            this.pendingTapToggle = null;
        }
    }

    /** Record where a pointer press started, to discriminate tap from drag. */
    private onPointerDown = (event: PointerEvent): void => {
        // A primary pointer starts a new interaction: nothing else is down.
        if (event.isPrimary) {
            this.pointers.clear();
        }
        this.pointers.add(event.pointerId);
        if (this.pointers.size === 1) {
            this.gestureReported = false;
            this.multiTouch = false;
            this.tapStartX = event.clientX;
            this.tapStartY = event.clientY;
            this.tapStartTime = event.timeStamp;
        } else {
            // Second finger down: a pinch.
            this.multiTouch = true;
            this.reportGesture();
        }
    };

    /** A press only counts while a button/finger is down (hover moves are ignored). */
    private onPointerMove = (event: PointerEvent): void => {
        if (!this.pointers.has(event.pointerId) || this.gestureReported || event.buttons === 0) return;
        if (Math.abs(event.clientX - this.tapStartX) > ViewerTapToggleDirective.TAP_MOVE_THRESHOLD ||
            Math.abs(event.clientY - this.tapStartY) > ViewerTapToggleDirective.TAP_MOVE_THRESHOLD) {
            this.reportGesture();
        }
    };

    private onPointerCancel = (event: PointerEvent): void => {
        this.pointers.delete(event.pointerId);
    };

    private reportGesture(): void {
        if (this.gestureReported || !this.gestureStart.observed) return;
        this.gestureReported = true;
        this.zone.run(() => this.gestureStart.emit());
    }

    private onPointerUp = (event: PointerEvent): void => {
        // Heard on the window: only presses that started on the host count.
        if (!this.pointers.delete(event.pointerId)) return;
        if (!this.breakpointService.isMobile() || this.multiTouch) return;

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
