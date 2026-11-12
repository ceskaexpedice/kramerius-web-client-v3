import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { DatePickerComponent } from './date-picker.component';

/**
 * minDate/maxDate restrict the picker to dates that exist in the opened
 * document (e.g. a periodical volume's first..last issue): typed dates outside
 * are rejected, computed end dates (+N days) are clamped.
 */
describe('DatePickerComponent bounds', () => {
  let component: DatePickerComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [DatePickerComponent, TranslateModule.forRoot()],
    });
    // Logic only - the template's child components pull in unrelated services.
    TestBed.overrideComponent(DatePickerComponent, { set: { template: '', imports: [] } });
    const fixture = TestBed.createComponent(DatePickerComponent);
    component = fixture.componentInstance;
    component.minDate = new Date(1897, 11, 16);
    component.maxDate = new Date(1897, 11, 31);
  });

  it('rejects a typed date outside the bounds and flags it', () => {
    component.selectedDateFrom.set(new Date(1897, 11, 16));
    component.onDateFromInputChange('05.01.1898');
    expect(component.selectedDateFrom()).toEqual(new Date(1897, 11, 16));
    expect(component.outOfRangeInput()).toBeTrue();
  });

  it('accepts a typed date inside the bounds', () => {
    component.onDateFromInputChange('20.12.1897');
    expect(component.selectedDateFrom()).toEqual(new Date(1897, 11, 20));
    expect(component.outOfRangeInput()).toBeFalse();
  });

  it('clamps "+ week" to maxDate and shortens the offset accordingly', () => {
    component.selectedDateFrom.set(new Date(1897, 11, 28));
    component.onOffsetClick(7);
    expect(component.selectedDateTo()).toEqual(new Date(1897, 11, 31));
    expect(component.selectedOffset()).toBe(3);
  });

  it('ignores calendar clicks outside the bounds', () => {
    component.selectedDateFrom.set(new Date(1897, 11, 20));
    component.onDateFromSelect(new Date(1897, 11, 1));
    expect(component.selectedDateFrom()).toEqual(new Date(1897, 11, 20));
  });

  it('offers only the years inside the bounds', () => {
    component.minDate = new Date(1897, 11, 16);
    component.maxDate = new Date(1898, 11, 31);
    expect(component.boundedYears).toEqual([1897, 1898]);
  });

  it('is unrestricted without bounds', () => {
    component.minDate = null;
    component.maxDate = null;
    component.onDateFromInputChange('05.01.1898');
    expect(component.selectedDateFrom()).toEqual(new Date(1898, 0, 5));
    expect(component.boundedYears).toBeNull();
  });
});
