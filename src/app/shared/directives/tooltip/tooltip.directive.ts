import {
  Directive,
  Input,
  ElementRef,
  ComponentRef,
  HostListener,
  ViewContainerRef,
  Injector,
  ApplicationRef
} from '@angular/core';
import { TooltipComponent } from './tooltip.component';

@Directive({
  selector: '[appTooltip]',
  standalone: true
})
export class TooltipDirective {
  @Input('appTooltip') text = '';
  @Input() tooltipPosition: 'top' | 'bottom' | 'left' | 'right' = 'top';

  private tooltipRef?: ComponentRef<TooltipComponent>;

  constructor(
    private elementRef: ElementRef,
    private viewContainerRef: ViewContainerRef,
    private injector: Injector,
    private appRef: ApplicationRef
  ) {}

  @HostListener('mouseenter')
  @HostListener('focusin')
  show() {
    if (!this.text || this.tooltipRef) return;

    const tooltip = document.createElement('div');
    const compRef = this.viewContainerRef.createComponent(TooltipComponent);
    this.tooltipRef = compRef;

    compRef.instance.text = this.text;
    compRef.instance.position = this.tooltipPosition;

    const hostEl = this.elementRef.nativeElement as HTMLElement;
    const tooltipEl = compRef.location.nativeElement as HTMLElement;

    hostEl.style.position = hostEl.style.position || 'relative';
    tooltipEl.classList.add('show');
    hostEl.appendChild(tooltipEl);
  }

  @HostListener('mouseleave')
  @HostListener('focusout')
  hide() {
    if (this.tooltipRef) {
      this.tooltipRef.destroy();
      this.tooltipRef = undefined;
    }
  }
}
