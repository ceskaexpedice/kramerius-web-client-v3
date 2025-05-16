import {Component, EventEmitter, Input, Output} from '@angular/core';

@Component({
  selector: 'app-year-navigator',
  imports: [],
  templateUrl: './year-navigator.component.html',
  styleUrl: './year-navigator.component.scss'
})
export class YearNavigatorComponent {

  @Input() year!: number | string;
  @Output() goToNextYear = new EventEmitter<void>();
  @Output() goToPreviousYear = new EventEmitter<void>();

  prevYear() {
    this.goToPreviousYear.emit();
  }

  nextYear() {
    this.goToNextYear.emit();
  }

}
