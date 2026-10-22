import {SimpleChange} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {PeriodicalYearsTimelineComponent} from './periodical-years-timeline.component';
import {PeriodicalItemYear} from '../../../models/periodical-item';
import {RecordHandlerService} from '../../../../shared/services/record-handler.service';
import {PopupPositioningService} from '../../../../shared/services/popup-positioning.service';

describe('PeriodicalYearsTimelineComponent', () => {

  let component: PeriodicalYearsTimelineComponent;

  const year = (value: string): PeriodicalItemYear => ({ year: value, pid: `uuid:${value}` } as PeriodicalItemYear);

  const setYears = (values: string[]) => {
    const years = values.map(year);
    component.ngOnChanges({ years: new SimpleChange(undefined, years, true) });
  };

  const cellFor = (yearKey: number) =>
    component.yearsByDecades.flat().find(c => c?.yearKey === yearKey) ?? null;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: RecordHandlerService, useValue: {} },
        { provide: PopupPositioningService, useValue: { createPopupState: () => ({}), cleanup: () => {} } },
      ],
    });
    component = TestBed.runInInjectionContext(() => new PeriodicalYearsTimelineComponent());
  });

  it('places a combined volume written with an en dash into its start year (#204)', () => {
    setYears(['1963', '1964–1965', '1966']);

    expect(component.otherYears).toEqual([]);
    expect(cellFor(1964)?.entries.map(e => e.year)).toEqual(['1964–1965']);
  });

  it('places a combined volume written with an em dash or spaced hyphen into its start year', () => {
    setYears(['1970—1971', '1972 - 1973']);

    expect(component.otherYears).toEqual([]);
    expect(cellFor(1970)?.entries.map(e => e.year)).toEqual(['1970—1971']);
    expect(cellFor(1972)?.entries.map(e => e.year)).toEqual(['1972 - 1973']);
  });

  it('places ranges wider than one year into their start year instead of the bottom row', () => {
    setYears(['1960', '1961-1964']);

    expect(component.otherYears).toEqual([]);
    expect(cellFor(1961)?.entries.map(e => e.year)).toEqual(['1961-1964']);
  });

  it('merges a range into an existing single-year cell', () => {
    setYears(['1964', '1964–1965']);

    expect(cellFor(1964)?.entries.map(e => e.year)).toEqual(['1964', '1964–1965']);
  });

  it('keeps unparseable values in the bottom row', () => {
    setYears(['1960', '196?', 'neuvedeno']);

    expect(component.otherYears.map(y => y.year)).toEqual(['196?', 'neuvedeno']);
  });
});
