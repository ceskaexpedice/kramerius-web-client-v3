import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges, ViewChild, inject } from '@angular/core';
import { LiveAnnouncer } from '@angular/cdk/a11y';
import { ConfigService } from '../../../core/config';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { DetailViewService } from '../../../modules/detail-view-page/services/detail-view.service';
import { UserService } from '../../services/user.service';
import { TtsService } from '../../services/tts.service';
import { CdkTooltipDirective } from '../../directives/cdk-tooltip';

@Component({
    selector: 'app-selection-controls',
    standalone: true,
    imports: [TranslatePipe, CdkTooltipDirective],
    templateUrl: './selection-controls.html',
    styleUrl: './selection-controls.scss'
})
export class SelectionControls implements OnChanges, OnDestroy {
    @Output() text = new EventEmitter<void>();
    @Output() export = new EventEmitter<void>();
    @Output() share = new EventEmitter<void>();
    @Output() read = new EventEmitter<void>();
    @Output() translate = new EventEmitter<void>();
    @Output() summarize = new EventEmitter<void>();
    @Output() cancel = new EventEmitter<void>();

    /** Collapsed: only the drag handle is shown. */
    @Input() collapsed = false;
    @Output() collapsedChange = new EventEmitter<boolean>();
    /**
     * Collapsed by the viewer (not the reader) after an action that opens a
     * panel, so the toolbar stops covering the scan the reader now compares
     * with it. The handle then pulses and briefly says so, so the reader knows
     * where the toolbar went and how to get it back.
     */
    @Input() autoCollapsed = false;
    /** Incremental pointer movement (px) while the toolbar is dragged by its handle. */
    @Output() dragBy = new EventEmitter<{ dx: number; dy: number }>();

    /** Movement (px) below which a press on the handle counts as a click, not a drag. */
    private static readonly DRAG_THRESHOLD = 4;
    private dragPointerId: number | null = null;
    private lastX = 0;
    private lastY = 0;
    private dragDistance = 0;
    /** Set when a press turned into a drag, so the click that follows it is ignored. */
    private suppressNextClick = false;

    /** How long the "toolbar collapsed" hint stays up after an auto-collapse. */
    private static readonly AUTO_COLLAPSE_HINT_MS = 4000;
    @ViewChild('handleTooltip', { read: CdkTooltipDirective }) private handleTooltip?: CdkTooltipDirective;
    private hintTimer: ReturnType<typeof setTimeout> | null = null;

    private configService = inject(ConfigService);
    private liveAnnouncer = inject(LiveAnnouncer);
    private translateService = inject(TranslateService);
    private detailViewService = inject(DetailViewService, { optional: true });
    private userService = inject(UserService);
    ttsService = inject(TtsService);

    // Selection control visibility getters
    get showText(): boolean {
        return this.configService.isSelectionControlEnabled('text');
    }

    /**
     * The crop *download* button. Selecting an area and previewing its text stay
     * available under a restricted license — only taking the image away is
     * blocked, which is exactly what `crop: false` means (DNNTO).
     *
     * Outside the detail view there is no document to consult (the component is
     * also used where no DetailViewService is provided), so the license gate
     * defers to the config gate alone.
     */
    get showExport(): boolean {
        return this.configService.isSelectionControlEnabled('export')
            && (this.detailViewService?.isActionAllowed('crop') ?? true);
    }

    get showShare(): boolean {
        return this.configService.isSelectionControlEnabled('share');
    }

    /**
     * AI actions on the selected area — the same gates as the AI tab in the
     * sidebar: the feature is on, the reader is logged in and the licence of the
     * open page allows working with its text. Outside the detail view there is
     * no page to act on, so the buttons stay hidden there.
     */
    get showAi(): boolean {
        return !!this.detailViewService
            && this.configService.isFeatureEnabled('ai')
            && this.configService.isSelectionControlEnabled('ai')
            && this.userService.isLoggedIn
            && this.detailViewService.isActionAllowed('text');
    }

    ngOnChanges(changes: SimpleChanges) {
        const change = changes['autoCollapsed'];
        if (!change || change.firstChange && !change.currentValue) return;
        if (this.autoCollapsed) {
            this.announceAutoCollapse();
        } else {
            this.clearHint();
            this.handleTooltip?.hideTooltip();
        }
    }

    ngOnDestroy() {
        this.clearHint();
    }

    /** Tooltip on the handle; while auto-collapsed it explains what happened. */
    get handleHint(): string {
        const t = (key: string) => this.translateService.instant(key);
        if (this.autoCollapsed) return t('selection-auto-collapsed--hint');
        const action = t(this.collapsed ? 'selection-expand--arialabel' : 'selection-collapse--arialabel');
        return `${action}. ${t('selection-move--title')}`;
    }

    private announceAutoCollapse() {
        this.liveAnnouncer.announce(this.translateService.instant('selection-auto-collapsed--hint'), 'polite');
        // The tooltip needs the collapsed handle rendered first.
        setTimeout(() => this.handleTooltip?.showTooltip());
        this.clearHint();
        this.hintTimer = setTimeout(() => {
            this.hintTimer = null;
            this.handleTooltip?.hideTooltip();
        }, SelectionControls.AUTO_COLLAPSE_HINT_MS);
    }

    private clearHint() {
        if (this.hintTimer) {
            clearTimeout(this.hintTimer);
            this.hintTimer = null;
        }
    }

    onHandleClick() {
        if (this.suppressNextClick) {
            this.suppressNextClick = false;
            return;
        }
        this.collapsed = !this.collapsed;
        this.collapsedChange.emit(this.collapsed);
    }

    // The toolbar lives inside the OpenSeadragon element, so every pointer
    // event on the handle is stopped here — otherwise OSD would pan the image
    // (or the selection plugin would start a new rectangle) under the drag.
    onHandlePointerDown(event: PointerEvent) {
        if (event.button !== 0) return;
        event.stopPropagation();
        this.dragPointerId = event.pointerId;
        this.dragDistance = 0;
        this.suppressNextClick = false;
        this.lastX = event.clientX;
        this.lastY = event.clientY;
        try {
            (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
        } catch { /* pointer already gone (or synthetic) — drag still works while over the handle */ }
    }

    onHandlePointerMove(event: PointerEvent) {
        if (this.dragPointerId !== event.pointerId) return;
        event.preventDefault();
        event.stopPropagation();
        const dx = event.clientX - this.lastX;
        const dy = event.clientY - this.lastY;
        if (this.dragDistance < SelectionControls.DRAG_THRESHOLD) {
            this.dragDistance += Math.abs(dx) + Math.abs(dy);
            if (this.dragDistance < SelectionControls.DRAG_THRESHOLD) return;
        }
        this.lastX = event.clientX;
        this.lastY = event.clientY;
        this.suppressNextClick = true;
        if (dx || dy) this.dragBy.emit({ dx, dy });
    }

    onHandlePointerUp(event: PointerEvent) {
        if (this.dragPointerId !== event.pointerId) return;
        event.stopPropagation();
        this.dragPointerId = null;
        try {
            (event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId);
        } catch { /* not captured */ }
    }

    onCancel() {
        this.cancel.emit();
    }

    onText() {
        this.text.emit();
    }

    onExport() {
        this.export.emit();
    }

    onShare() {
        this.share.emit();
    }

    onRead() {
        this.read.emit();
    }

    onTranslate() {
        this.translate.emit();
    }

    onSummarize() {
        this.summarize.emit();
    }
}
