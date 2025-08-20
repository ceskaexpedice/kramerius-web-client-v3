import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {MatSlideToggle} from '@angular/material/slide-toggle';
import {TranslatePipe} from '@ngx-translate/core';
import {DatePickerComponent} from '../../../../components/date-picker/date-picker.component';
import {InputComponent} from '../../../../components/input/input.component';

@Component({
  selector: 'advanced-date-filter',
  imports: [
    CommonModule,
    FormsModule,
    MatSlideToggle,
    TranslatePipe,
    DatePickerComponent,
    InputComponent
  ],
  templateUrl: './advanced-date-filter.component.html',
  styleUrl: './advanced-date-filter.component.scss'
})
export class AdvancedDateFilterComponent implements OnInit {
  @Input() initialValue: string = '';
  @Input() solrField: string = '';

  @Output() valueChange = new EventEmitter<{elementValue: string, solrValue: string}>();
  @Output() addYearFilter = new EventEmitter<void>();

  // Component state
  withoutSpecificYear = false;
  dayMonthFrom = '';
  dayMonthTo = '';
  dateFrom: Date | null = null;
  dateTo: Date | null = null;
  dateOffset = 0;

  ngOnInit() {
    this.parseInitialValue();
  }

  // Main Solr query building method for day-month ranges
  private buildDateRangeFilter(startDay: number, startMonth: number, endDay: number, endMonth: number): string {
    const filters: string[] = [];
    
    if (startMonth === endMonth) {
      // Same month - simple day range
      filters.push(`(date_range_start.month:${startMonth} AND date_range_start.day:[${startDay} TO ${endDay}])`);
    } else {
      // Cross multiple months
      
      // Starting month (from startDay to end of month)
      filters.push(`(date_range_start.month:${startMonth} AND date_range_start.day:[${startDay} TO 31])`);
      
      // Full months in between
      let currentMonth = startMonth + 1;
      if (currentMonth > 12) currentMonth = 1; // Handle year wrap
      
      while (currentMonth !== endMonth) {
        filters.push(`(date_range_start.month:${currentMonth})`);
        currentMonth++;
        if (currentMonth > 12) currentMonth = 1; // Handle year wrap
      }
      
      // Ending month (from start of month to endDay)
      filters.push(`(date_range_start.month:${endMonth} AND date_range_start.day:[1 TO ${endDay}])`);
    }
    
    return `(${filters.join(' OR ')})`;
  }

  onWithoutYearToggle(event: any) {
    this.withoutSpecificYear = event.checked;
    if (event.checked) {
      this.parseExistingDatesToDayMonth();
    } else {
      this.dayMonthFrom = '';
      this.dayMonthTo = '';
    }
    this.updateFilterValue();
  }

  onDayMonthFromChange(value: string | number) {
    this.dayMonthFrom = String(value);
    this.validateAndUpdateFilter();
  }

  onDayMonthToChange(value: string | number) {
    this.dayMonthTo = String(value);
    this.validateAndUpdateFilter();
  }

  onDatePickerChange(event: any) {
    this.dateFrom = event.dateFrom;
    this.dateTo = event.dateTo;
    this.dateOffset = event.offset;
    this.updateFilterValue();
  }

  onAddYearFilter() {
    this.addYearFilter.emit();
  }

  private validateAndUpdateFilter() {
    // Validate DD.MM format
    const dayMonthPattern = /^(0[1-9]|[12][0-9]|3[01])\.(0[1-9]|1[0-2])$/;
    
    if (this.dayMonthFrom && this.dayMonthTo && 
        dayMonthPattern.test(this.dayMonthFrom) && 
        dayMonthPattern.test(this.dayMonthTo)) {
      this.updateFilterValue();
    }
  }

  private updateFilterValue() {
    if (this.withoutSpecificYear && this.dayMonthFrom && this.dayMonthTo) {
      // Parse DD.MM values
      const [startDay, startMonth] = this.dayMonthFrom.split('.').map(Number);
      const [endDay, endMonth] = this.dayMonthTo.split('.').map(Number);
      
      // Build Solr query using the provided method
      const solrValue = this.buildDateRangeFilter(startDay, startMonth, endDay, endMonth);
      const elementValue = `${this.dayMonthFrom}-${this.dayMonthTo}`;
      
      this.valueChange.emit({ elementValue, solrValue });
    } else if (!this.withoutSpecificYear && this.dateFrom) {
      // Handle regular date picker values (existing logic)
      let elementValue, solrValue;
      
      if (this.dateOffset === 0 && this.dateTo) {
        elementValue = `[${this.dateFrom.toISOString()} TO ${this.dateTo.toISOString()}]`;
        solrValue = elementValue;
      } else if (this.dateOffset > 0) {
        const formattedDate = this.dateFrom.toISOString().split('T')[0];
        elementValue = `${formattedDate}+${this.dateOffset}`;
        solrValue = elementValue;
      } else {
        const formattedDate = this.dateFrom.toISOString().split('T')[0];
        elementValue = `${formattedDate}+0`;
        solrValue = elementValue;
      }
      
      this.valueChange.emit({ elementValue, solrValue });
    }
  }

  private parseInitialValue() {
    if (!this.initialValue) return;
    
    // Check if it's a day-month range format (DD.MM-DD.MM)
    const dayMonthRangePattern = /^(\d{2}\.\d{2})-(\d{2}\.\d{2})$/;
    const dayMonthMatch = this.initialValue.match(dayMonthRangePattern);
    
    if (dayMonthMatch) {
      this.withoutSpecificYear = true;
      this.dayMonthFrom = dayMonthMatch[1];
      this.dayMonthTo = dayMonthMatch[2];
      return;
    }
    
    // Parse regular date formats (existing parseFromString logic)
    const parsed = this.parseFromString(this.initialValue);
    if (parsed) {
      this.dateFrom = parsed.dateFrom;
      this.dateTo = parsed.dateTo || null;
      this.dateOffset = parsed.offset;
      this.withoutSpecificYear = false;
    }
  }

  private parseExistingDatesToDayMonth() {
    if (this.dateFrom) {
      this.dayMonthFrom = this.formatDateToDayMonth(this.dateFrom);
    }
    if (this.dateTo) {
      this.dayMonthTo = this.formatDateToDayMonth(this.dateTo);
    }
  }

  private formatDateToDayMonth(date: Date): string {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    return `${day}.${month}`;
  }

  private parseFromString(dateString: string): { dateFrom: Date; dateTo?: Date; offset: number } | null {
    if (!dateString) {
      return null;
    }

    const singleDatePattern = /^(\d{4})-(\d{2})-(\d{2})\+(-?\d+)$/;
    const rangePattern = /^\[([0-9T:\-\.Z]+)\s+TO\s+([0-9T:\-\.Z]+)\]$/;

    const singleMatch = dateString.match(singleDatePattern);
    const rangeMatch = dateString.match(rangePattern);

    if (singleMatch) {
      const [, yearStr, monthStr, dayStr, offsetStr] = singleMatch;
      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10);
      const day = parseInt(dayStr, 10);
      const offset = parseInt(offsetStr, 10);

      const isValid = !isNaN(year) && !isNaN(month) && !isNaN(day) && !isNaN(offset);
      if (!isValid) {
        console.warn('Parsed values are invalid (single date):', { year, month, day, offset });
        return null;
      }

      const dateFrom = new Date(Date.UTC(year, month - 1, day));
      return { dateFrom, offset };
    }

    if (rangeMatch) {
      const [, fromStr, toStr] = rangeMatch;

      const fromDate = new Date(fromStr);
      const toDate = new Date(toStr);

      if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
        console.warn('Invalid date range values:', { fromStr, toStr });
        return null;
      }

      return { dateFrom: fromDate, dateTo: toDate, offset: 0 };
    }

    console.warn('Invalid date string format:', dateString);
    return null;
  }
}