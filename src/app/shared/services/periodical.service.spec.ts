import { signal } from '@angular/core';
import { PeriodicalService } from './periodical.service';
import { ViewMode } from '../../modules/periodical/models/view-mode.enum';

/**
 * Focused test for handleDocument's view-mode decision. The real service has a
 * heavy constructor (eager store/router wiring), so we build a bare instance via
 * Object.create and stub only the members handleDocument touches.
 */
function makeService(overrides: {
  queryParams: Record<string, string>;
  submittedTerm: string;
  storedView: string;
}): { service: PeriodicalService; viewMode: ReturnType<typeof signal<ViewMode>> } {
  const service = Object.create(PeriodicalService.prototype) as any;
  const viewMode = signal<ViewMode>(ViewMode.Timeline);

  service.viewMode = viewMode;
  service.route = { snapshot: { queryParams: overrides.queryParams } };
  // hasSubmittedQuery is a getter on the prototype; override it on the instance.
  Object.defineProperty(service, 'hasSubmittedQuery', {
    value: () => overrides.submittedTerm.trim().length > 0,
    configurable: true,
  });
  service.setSelectedYear = () => {};
  service.setView = (view: string) => {
    // Mirror the real setView's relevant outcome: it can only produce
    // non-search view modes, so model it as switching to the years grid.
    viewMode.set(view === 'grid' ? ViewMode.GridYears : ViewMode.Timeline);
  };
  service.loadViewModeFromLocalStorage = () => overrides.storedView;

  return { service, viewMode };
}

describe('PeriodicalService.handleDocument view mode', () => {
  it('keeps SearchResults when a search query is active (not clobbered by stored view)', () => {
    const { service, viewMode } = makeService({
      queryParams: { query: 'chochola' },
      submittedTerm: 'chochola',
      storedView: 'grid',
    });

    service.handleDocument({ model: 'periodical' });

    expect(viewMode()).toBe(ViewMode.SearchResults);
  });

  it('keeps SearchResults when only the submitted term is set (query not yet in URL)', () => {
    const { service, viewMode } = makeService({
      queryParams: {},
      submittedTerm: 'chochola',
      storedView: 'grid',
    });

    service.handleDocument({ model: 'periodical' });

    expect(viewMode()).toBe(ViewMode.SearchResults);
  });

  it('restores the stored view when there is no search query', () => {
    const { service, viewMode } = makeService({
      queryParams: {},
      submittedTerm: '',
      storedView: 'grid',
    });

    service.handleDocument({ model: 'periodical' });

    expect(viewMode()).toBe(ViewMode.GridYears);
  });
});
