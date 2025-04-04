import { Component, Input, Output, EventEmitter, signal, HostListener } from '@angular/core';
import {NgForOf, NgStyle} from '@angular/common';

@Component({
  selector: 'app-range-slider',
  imports: [
    NgStyle,
    NgForOf,
  ],
  templateUrl: './range-slider.component.html',
  styleUrl: './range-slider.component.scss'
})
export class RangeSliderComponent {
  min = 0;
  max = 100;

  from = signal(10);
  to = signal(30);

  onFromInput(value: number) {
    const num = Math.min(Math.max(this.min, value), this.to());
    this.from.set(num);
  }

  onToInput(value: number) {
    const num = Math.max(Math.min(this.max, value), this.from());
    this.to.set(num);
  }

  getProgressLeft() {
    return ((this.from() - this.min) / (this.max - this.min)) * 100;
  }

  getProgressRight() {
    return 100 - ((this.to() - this.min) / (this.max - this.min)) * 100;
  }

}
