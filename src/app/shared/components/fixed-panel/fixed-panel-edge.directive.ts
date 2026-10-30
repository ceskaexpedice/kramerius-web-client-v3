import { Directive, ElementRef, OnDestroy, OnInit, inject, input } from '@angular/core';
import { FixedPanelEdgeSide, FixedPanelService } from './fixed-panel.service';

/**
 * Marks page chrome (header, toolbar, nav bar) that fixed panels sit between.
 * The host stays interactive while a panel is open and its box bounds the panel.
 */
@Directive({
  selector: '[appFixedPanelEdge]',
  standalone: true
})
export class FixedPanelEdgeDirective implements OnInit, OnDestroy {
  /** Which side of the panel this element bounds. */
  readonly appFixedPanelEdge = input<FixedPanelEdgeSide>('top');

  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly fixedPanel = inject(FixedPanelService);
  private unregister: (() => void) | null = null;

  ngOnInit(): void {
    this.unregister = this.fixedPanel.registerEdge(this.el.nativeElement, this.appFixedPanelEdge());
  }

  ngOnDestroy(): void {
    this.unregister?.();
    this.unregister = null;
  }
}
