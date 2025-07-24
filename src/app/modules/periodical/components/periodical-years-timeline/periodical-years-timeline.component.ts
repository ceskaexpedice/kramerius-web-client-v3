import {Component, EventEmitter, Input, OnChanges, Output, SimpleChanges} from '@angular/core';
import {PeriodicalItemYear} from '../../../models/periodical-item';
import {NgClass, NgForOf, NgIf} from '@angular/common';

@Component({
  selector: 'app-periodical-years-timeline',
  imports: [
    NgForOf,
    NgClass,
    NgIf,
  ],
  templateUrl: './periodical-years-timeline.component.html',
  styleUrls: ['./periodical-years-timeline.component.scss', '../periodical-base.scss']
})
export class PeriodicalYearsTimelineComponent implements OnChanges {

  groupedYears: any[] = [];
  yearsByDecades: (number | null)[][] = [];
  rangeYears: PeriodicalItemYear[] = [];


  @Input() years: PeriodicalItemYear[] = [];
  @Output() selectYear = new EventEmitter<string>();

  ngOnChanges(changes: SimpleChanges) {
    if (changes['years']?.currentValue) {
      const allYears = changes['years'].currentValue as PeriodicalItemYear[];

      const singleYears = allYears.filter(y => /^\d{4}$/.test(y.year));
      this.rangeYears = allYears.filter(y => /^\d{4}-\d{4}$/.test(y.year));

      const numericYears = singleYears.map(y => Number(y.year));
      this.yearsByDecades = this.groupYearsByDecades(numericYears);
    }
  }

  groupYears(years: any[]): any[][] {
    const rows = [];
    for (let i = 0; i < years.length; i += 10) {
      rows.push(years.slice(i, i + 10));
    }
    return rows;
  }

  groupYearsByDecades(years: number[]): (number | null)[][] {
    const yearSet = new Set(years);
    const allYears = Array.from(yearSet).sort((a, b) => a - b);

    const minYear = Math.floor(allYears[0] / 10) * 10;
    const maxYear = Math.ceil(allYears[allYears.length - 1] / 10) * 10;

    const result: (number | null)[][] = [];

    for (let decadeStart = minYear; decadeStart < maxYear; decadeStart += 10) {
      const decade: (number | null)[] = [];
      for (let i = 0; i < 10; i++) {
        const y = decadeStart + i;
        decade.push(yearSet.has(y) ? y : null);
      }
      result.push(decade);
    }

    return result;
  }

  isYearAvailable(year: number | null): boolean {
    if (year === null) {
      return false;
    }

    // Check if the year is in the years array
    const isAvailable = this.years.some(y => y.year == year.toString());
    return isAvailable;
  }

  protected readonly Number = Number;
}
