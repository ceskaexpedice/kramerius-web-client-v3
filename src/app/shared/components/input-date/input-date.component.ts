import {Component, EventEmitter, Input, Output, WritableSignal} from '@angular/core';
import {DatePipe, NgClass, NgIf} from '@angular/common';

@Component({
  selector: 'app-input-date',
  imports: [
    DatePipe,
    NgIf,
    NgClass,
  ],
  templateUrl: './input-date.component.html',
  styleUrl: './input-date.component.scss'
})
export class InputDateComponent {

  @Input() valueSignal!: WritableSignal<Date | undefined>;
  @Input() label: string = '';
  @Input() minDate?: Date;
  @Input() maxDate?: Date;
  @Input() theme: string = 'light';
  @Input() size: 'sm' | 'md' = 'md';

  @Output() valueChange = new EventEmitter<Date>();

  ngOnInit() {
    if (!this.valueSignal) {
      throw new Error('valueSignal is required for InputDateComponent');
    }
  }

  get displayValue(): string {
    const val = this.valueSignal();
    return val ? this.formatDate(val) : '';
  }

  onDateChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const val = input.value;
    if (val) {
      const newDate = new Date(val);
      if (!isNaN(newDate.getTime())) {
        this.valueSignal.set(newDate);
        this.valueChange.emit(newDate);
      }
    }
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  get min(): string | null {
    return this.minDate ? this.minDate.toISOString().split('T')[0] : null;
  }

  get max(): string | null {
    return this.maxDate ? this.maxDate.toISOString().split('T')[0] : null;
  }

}
