import {Component, EventEmitter, Input, Output, signal} from '@angular/core';
import {NgClass, NgIf} from '@angular/common';

@Component({
  selector: 'app-range-slider',
  imports: [
    NgIf,
    NgClass,
  ],
  templateUrl: './range-slider.component.html',
  styleUrl: './range-slider.component.scss'
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
  }

  onFromInput(value: number) {
    if (value > this.to()) return; // zabráni prekročeniu to
    const num = Math.min(Math.max(this.min, value), this.to());
    this.from.set(num);
    this.lastMoved = 'from';
    this.emitChange();
  }

  onToInput(value: number) {
    if (value < this.from()) return; // zabráni prekročeniu from
    const num = Math.max(Math.min(this.max, value), this.from());
    this.to.set(num);
    this.lastMoved = 'to';
    this.emitChange();
  }

  emitChange() {
    this.rangeChange.emit({ from: this.from(), to: this.to() });
  }

  getProgressLeft() {
    return ((this.from() - this.min) / (this.max - this.min)) * 100;
  }

  getProgressRight() {
    return 100 - ((this.to() - this.min) / (this.max - this.min)) * 100;
  }

}
