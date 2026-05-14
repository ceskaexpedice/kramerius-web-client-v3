import {Component, computed, EventEmitter, inject, Input, OnChanges, OnDestroy, Output, signal, SimpleChanges} from '@angular/core';
import {PeriodicalItemYear} from '../../../models/periodical-item';
import {NgClass, NgForOf, NgIf} from '@angular/common';
import {RecordHandlerService} from '../../../../shared/services/record-handler.service';
import {PopupPositioningService, PopupState} from '../../../../shared/services/popup-positioning.service';
import {RecordItem} from '../../../../shared/components/record-item/record-item.model';
import {DocumentTypeEnum} from '../../../constants/document-type';
import {PeriodicalDayIssuesPopupComponent} from '../periodical-day-issues-popup/periodical-day-issues-popup.component';

interface YearCell {
  yearKey: number;
  entries: PeriodicalItemYear[];
}

@Component({
  selector: 'app-periodical-years-timeline',
  imports: [
    NgForOf,
    NgClass,
    NgIf,
    PeriodicalDayIssuesPopupComponent,
  ],
  templateUrl: './periodical-years-timeline.component.html',
  styleUrls: ['./periodical-years-timeline.component.scss', '../periodical-base.scss']
})
export class PeriodicalYearsTimelineComponent implements OnChanges, OnDestroy {

  yearsByDecades: (YearCell | null)[][] = [];
  otherYears: PeriodicalItemYear[] = [];

  public recordHandler = inject(RecordHandlerService);
  private popupPositioningService = inject(PopupPositioningService);

  popupEntries = signal<PeriodicalItemYear[]>([]);
  popupRecordItems = computed<RecordItem[]>(() =>
    this.popupEntries().map(entry => this.toRecordItem(entry))
  );
  volumesPopupState: PopupState = this.popupPositioningService.createPopupState();

  @Input() years: PeriodicalItemYear[] = [];
  @Output() selectYear = new EventEmitter<string>();

  ngOnChanges(changes: SimpleChanges) {
    if (changes['years']?.currentValue) {
      const allYears = changes['years'].currentValue as PeriodicalItemYear[];

      const singleYearRe = /^\d{4}$/;
      const rangeYearRe = /^\d{4}\s*-\s*\d{4}$/;

      const yearCellMap = new Map<number, PeriodicalItemYear[]>();
      this.otherYears = [];

      const addToMap = (key: number, entry: PeriodicalItemYear) => {
        if (yearCellMap.has(key)) {
          yearCellMap.get(key)!.push(entry);
        } else {
          yearCellMap.set(key, [entry]);
        }
      };

      // First pass: place single years
      for (const y of allYears) {
        const trimmed = y.year?.trim() ?? '';
        if (singleYearRe.test(trimmed)) {
          addToMap(Number(trimmed), y);
        }
      }

      // Second pass: ranges spanning ≤1 year are placed at their start year (creating a new
      // cell if needed, or merging as dots into an existing one). Wider ranges and
      // unparseable values go to the bottom row.
      for (const y of allYears) {
        const trimmed = y.year?.trim() ?? '';
        if (singleYearRe.test(trimmed)) continue;

        if (rangeYearRe.test(trimmed)) {
          const startYear = Number(trimmed.split('-')[0].trim());
          const endYear = Number(trimmed.split('-')[1].trim());
          if (endYear - startYear <= 1) {
            addToMap(startYear, y);
            continue;
          }
        }

        this.otherYears.push(y);
      }

      this.yearsByDecades = this.groupYearsByDecades(yearCellMap);
    }
  }

  groupYearsByDecades(yearCellMap: Map<number, PeriodicalItemYear[]>): (YearCell | null)[][] {
    const allYearNums = Array.from(yearCellMap.keys()).sort((a, b) => a - b);

    if (allYearNums.length === 0) return [];

    const minYear = Math.floor(allYearNums[0] / 10) * 10;
    const maxYear = Math.ceil(allYearNums[allYearNums.length - 1] / 10) * 10;

    const result: (YearCell | null)[][] = [];

    for (let decadeStart = minYear; decadeStart < maxYear; decadeStart += 10) {
      const decade: (YearCell | null)[] = [];
      for (let i = 0; i < 10; i++) {
        const y = decadeStart + i;
        const entries = yearCellMap.get(y);
        decade.push(entries ? { yearKey: y, entries } : null);
      }
      result.push(decade);
    }

    return result;
  }

  getNonNullCells(cells: (YearCell | null)[]): YearCell[] {
    return cells.filter(c => c !== null) as YearCell[];
  }

  getDecadeStartYear(row: (YearCell | null)[]): number {
    const firstNonNull = row.find(c => c !== null);
    if (firstNonNull) {
      return Math.floor(firstNonNull.yearKey / 10) * 10;
    }
    return 0;
  }

  getCellLicenseForBadge(cell: YearCell): string {
    // Use the most permissive accessibility across entries (public wins for the badge color)
    const hasPublic = cell.entries.some(e => this.recordHandler.getRecordLicenseForBadge(e.licenses) === 'public');
    if (hasPublic) return 'public';
    const firstNonPublic = cell.entries[0];
    return this.recordHandler.getRecordLicenseForBadge(firstNonPublic.licenses);
  }

  isCellLocked(cell: YearCell): boolean {
    return cell.entries.every(e => {
      const badge = this.recordHandler.getRecordLicenseForBadge(e.licenses);
      return badge === 'private' || badge === 'in_library';
    });
  }

  onCellClick(cell: YearCell, event: MouseEvent): void {
    if (cell.entries.length === 1) {
      this.selectYear.emit(cell.entries[0].year);
      return;
    }
    this.popupEntries.set(cell.entries);
    this.popupPositioningService.showPopup(
      this.volumesPopupState,
      {
        triggerEvent: event,
        preferredSide: 'center',
        offsetY: 4,
      },
      '.volumes-popup-wrapper',
    );
  }

  closePopup(): void {
    this.volumesPopupState.closePopup();
    this.popupEntries.set([]);
  }

  private toRecordItem(entry: PeriodicalItemYear): RecordItem {
    return {
      id: entry.pid,
      title: entry.year,
      model: (entry.model as DocumentTypeEnum) || DocumentTypeEnum.periodicalvolume,
      licenses: entry.licenses || [],
      className: 'card--fluid',
      showFavoriteButton: false,
      showAccessibilityBadge: true,
    };
  }

  ngOnDestroy(): void {
    this.popupPositioningService.cleanup();
  }

  protected readonly Number = Number;
}
