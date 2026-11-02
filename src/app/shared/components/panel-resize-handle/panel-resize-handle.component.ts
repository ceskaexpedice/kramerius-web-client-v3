import { Component, ElementRef, Input, OnDestroy, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { METADATA_SIDEBAR_MAX_WIDTH, METADATA_SIDEBAR_MIN_WIDTH, UiStateService } from '../../services/ui-state.service';
import { uiZoom } from '../../utils/ui-zoom';

/**
 * Drag handle on the inner (left) edge of the right metadata panel.
 * Pointer: drag to resize, or click (no drag) to cycle 300 / 400 / 520 px —
 * the single-pointer alternative to dragging (WCAG 2.5.7). Keyboard (WAI-ARIA
 * window splitter): ←/→ by 16px, Home/End to min/max, Enter resets to the
 * responsive default.
 */
@Component({
  selector: 'app-panel-resize-handle',
  imports: [TranslatePipe],
  template: `
    <div class="panel-resize-handle"
         role="separator"
         tabindex="0"
         aria-orientation="vertical"
         [attr.aria-label]="'metadata-panel--resize' | translate"
         [attr.aria-controls]="controls || null"
         [attr.aria-valuemin]="min"
         [attr.aria-valuemax]="max"
         [attr.aria-valuenow]="currentWidth()"
         [attr.title]="'metadata-panel--resize-hint' | translate"
         (pointerdown)="onPointerDown($event)"
         (pointermove)="onPointerMove($event)"
         (pointerup)="onPointerUp()"
         (pointercancel)="onPointerUp()"
         (keydown)="onKeydown($event)">
      <span class="panel-resize-handle__grip" aria-hidden="true"></span>
    </div>
  `,
  styleUrl: './panel-resize-handle.component.scss',
})
export class PanelResizeHandleComponent implements OnDestroy {
  /** id of the panel being resized. */
  @Input() controls = '';

  readonly min = METADATA_SIDEBAR_MIN_WIDTH;
  readonly max = METADATA_SIDEBAR_MAX_WIDTH;
  private static readonly STEP = 16;

  private uiState = inject(UiStateService);
  private host = inject(ElementRef<HTMLElement>);
  private dragStartX = 0;
  private dragStartWidth = 0;
  private dragging = false;
  private moved = false;
  /** Click (no drag) cycles these widths — single-pointer alternative to dragging (WCAG 2.5.7). */
  private static readonly PRESETS = [300, 400, 520];

  currentWidth(): number {
    const stored = this.uiState.metadataSidebarWidth();
    if (stored != null) return stored;
    const panel = this.panelElement();
    return panel ? Math.round(panel.getBoundingClientRect().width / uiZoom()) : this.min;
  }

  onPointerDown(event: PointerEvent): void {
    if (event.button !== 0) return;
    event.preventDefault();
    this.dragging = true;
    this.moved = false;
    this.dragStartX = event.clientX;
    this.dragStartWidth = this.currentWidth();
    (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
    document.body.classList.add('is-resizing-panel');
  }

  // Bound on the handle itself: setPointerCapture routes the whole drag here, so
  // no document-level listener runs change detection on every mouse move.
  onPointerMove(event: PointerEvent): void {
    if (!this.dragging) return;
    // Handle sits on the panel's left edge: dragging left widens the panel.
    const delta = (this.dragStartX - event.clientX) / uiZoom();
    if (!this.moved && Math.abs(delta) < 3) return;
    this.moved = true;
    this.uiState.setMetadataSidebarWidth(this.dragStartWidth + delta);
  }

  onPointerUp(): void {
    if (!this.dragging) return;
    this.dragging = false;
    document.body.classList.remove('is-resizing-panel');
    if (!this.moved) {
      const width = this.currentWidth();
      const presets = PanelResizeHandleComponent.PRESETS;
      const next = presets.find(p => p > width + 8) ?? presets[0];
      this.uiState.setMetadataSidebarWidth(next);
    }
  }

  onKeydown(event: KeyboardEvent): void {
    const width = this.currentWidth();
    let next: number | null = null;
    switch (event.key) {
      case 'ArrowLeft': next = width + PanelResizeHandleComponent.STEP; break;
      case 'ArrowRight': next = width - PanelResizeHandleComponent.STEP; break;
      case 'Home': next = this.min; break;
      case 'End': next = this.max; break;
      case 'Enter': this.reset(); event.preventDefault(); return;
    }
    if (next === null) return;
    event.preventDefault();
    event.stopPropagation();
    this.uiState.setMetadataSidebarWidth(next);
  }

  reset(): void {
    this.uiState.setMetadataSidebarWidth(null);
  }

  ngOnDestroy(): void {
    document.body.classList.remove('is-resizing-panel');
  }

  private panelElement(): HTMLElement | null {
    return (this.host.nativeElement as HTMLElement).parentElement;
  }
}
