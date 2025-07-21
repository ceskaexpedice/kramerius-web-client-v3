import { Component, Input, HostBinding } from '@angular/core';

@Component({
  selector: 'app-tooltip',
  standalone: true,
  template: `{{ text }}`,
  styleUrls: ['./tooltip.component.scss']
})
export class TooltipComponent {
  @Input() text = '';
  @Input() position: 'top' | 'bottom' | 'left' | 'right' = 'top';

  @HostBinding('class')
  get cssClass() {
    return `tooltip-box tooltip-${this.position}`;
  }
}
