import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-slider',
  standalone: true,
  imports: [],
  templateUrl: './slider.component.html',
  styleUrl: './slider.component.scss'
})
export class SliderComponent {
  @Input() value = 0;
  @Input() min = 0;
  @Input() max = 100;
  @Input() step = 1;
  @Input() ariaLabel = '';

  @Output() valueChange = new EventEmitter<number>();

  onInput(value: number): void {
    this.value = value;
    this.valueChange.emit(value);
  }

  getSliderBackground(): string {
    const range = this.max - this.min;
    const pct = range > 0 ? ((this.value - this.min) / range) * 100 : 0;
    return `linear-gradient(
      to right,
      var(--color-primary) 0%,
      var(--color-primary) ${pct}%,
      var(--color-bg-light) ${pct}%,
      var(--color-bg-light) 100%
    )`;
  }
}
