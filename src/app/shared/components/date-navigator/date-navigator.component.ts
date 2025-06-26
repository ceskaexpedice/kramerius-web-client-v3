import {Component, EventEmitter, Input, Output} from '@angular/core';

@Component({
  selector: 'app-date-navigator',
  imports: [],
  templateUrl: './date-navigator.component.html',
  styleUrl: './date-navigator.component.scss'
})
export class DateNavigatorComponent {

  @Input() mode: 'year' | 'date' = 'date';
  @Input() value!: string;

  @Output() goToNext = new EventEmitter<void>();
  @Output() goToPrevious = new EventEmitter<void>();

  prev() {
    this.goToPrevious.emit();
  }

  next() {
    this.goToNext.emit();
  }

}
