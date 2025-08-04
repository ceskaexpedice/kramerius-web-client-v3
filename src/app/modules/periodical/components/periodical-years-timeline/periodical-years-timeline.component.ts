import {Component, EventEmitter, inject, Input, OnChanges, Output, SimpleChanges} from '@angular/core';
import {PeriodicalItemYear} from '../../../models/periodical-item';
import {NgClass, NgForOf, NgIf} from '@angular/common';
import {RecordHandlerService} from '../../../../shared/services/record-handler.service';

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

  yearsByDecades: (PeriodicalItemYear | null)[][] = [];
  rangeYears: PeriodicalItemYear[] = [];

  public recordHandler = inject(RecordHandlerService);


  @Input() years: PeriodicalItemYear[] = [];
  @Output() selectYear = new EventEmitter<string>();

  ngOnChanges(changes: SimpleChanges) {
    if (changes['years']?.currentValue) {
      const allYears = changes['years'].currentValue as PeriodicalItemYear[];

      const singleYears = allYears.filter(y => /^\d{4}$/.test(y.year));
      this.rangeYears = allYears.filter(y => /^\d{4}-\d{4}$/.test(y.year));

      const numericYears = singleYears.map(y => Number(y.year));
      this.yearsByDecades = this.groupYearsByDecades(singleYears);
    }
  }

  groupYears(years: any[]): any[][] {
    const rows = [];
    for (let i = 0; i < years.length; i += 10) {
      rows.push(years.slice(i, i + 10));
    }
    return rows;
  }

  groupYearsByDecades(years: PeriodicalItemYear[]): (PeriodicalItemYear | null)[][] {
    const yearMap = new Map<number, PeriodicalItemYear>();

    years.forEach(y => {
      const num = Number(y.year);
      if (!isNaN(num)) {
        yearMap.set(num, y);
      }
    });

    const allYearNums = Array.from(yearMap.keys()).sort((a, b) => a - b);

    if (allYearNums.length === 0) return [];

    const minYear = Math.floor(allYearNums[0] / 10) * 10;
    const maxYear = Math.ceil(allYearNums[allYearNums.length - 1] / 10) * 10;

    const result: (PeriodicalItemYear | null)[][] = [];

    for (let decadeStart = minYear; decadeStart < maxYear; decadeStart += 10) {
      const decade: (PeriodicalItemYear | null)[] = [];
      for (let i = 0; i < 10; i++) {
        const y = decadeStart + i;
        decade.push(yearMap.get(y) ?? null);
      }
      result.push(decade);
    }

    return result;
  }

  protected readonly Number = Number;
}
