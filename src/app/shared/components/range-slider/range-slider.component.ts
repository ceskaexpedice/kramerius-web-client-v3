import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { NgClass, NgIf } from '@angular/common';
import { InputComponent } from '../input/input.component';

@Component({
  selector: 'app-range-slider',
  standalone: true,
  imports: [NgIf, NgClass, InputComponent],
  templateUrl: './range-slider.component.html',
  styleUrl: './range-slider.component.scss',
})
export class RangeSliderComponent {
  lastMoved: 'from' | 'to' = 'from';

  @Input() min = 0;
  @Input() max = 100;
  @Input() step = 1;

  @Input() initialFrom = 0;
  @Input() initialTo = 100;

  @Input() layout: 'default' | 'inline' = 'default';

  @Output() rangeChange = new EventEmitter<{ from: number; to: number }>();

  from = signal(this.initialFrom);
  to = signal(this.initialTo);

  ngOnInit() {
    this.from.set(this.initialFrom);
    this.to.set(this.initialTo);

    this.emitChange();
  }

  onFromInput(value: number | string) {
    const parsedValue = Number.parseInt(value.toString(), 10);

    // if (parsedValue > this.to()) {
    //   this.to.set(parsedValue);
    // }

    const clamped = Math.min(Math.max(this.min, parsedValue), this.max);
    this.from.set(clamped);
    this.lastMoved = 'from';
    this.emitChange();
  }

  onToInput(value: number | string) {
    const parsedValue = Number.parseInt(value.toString(), 10);

    // if (parsedValue < this.from()) {
    //   this.from.set(parsedValue);
    // }

    const clamped = Math.min(Math.max(this.min, parsedValue), this.max);
    this.to.set(clamped);
    this.lastMoved = 'to';
    this.emitChange();
  }

  emitChange() {
    this.rangeChange.emit({ from: this.from(), to: this.to() });
  }

  getSliderBackground(): string {
    const min = this.min;
    const max = this.max;
    const from = this.from();
    const to = this.to();
    const range = max - min;
    const fromPercent = ((from - min) / range) * 100;
    const toPercent = ((to - min) / range) * 100;

    return `linear-gradient(
      to right,
      var(--color-bg-light) 0%,
      var(--color-bg-light) ${fromPercent}%,
      var(--color-primary) ${fromPercent}%,
      var(--color-primary) ${toPercent}%,
      var(--color-bg-light) ${toPercent}%,
      var(--color-bg-light) 100%
    )`;
  }

  protected readonly Number = Number;
}
