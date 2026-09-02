import { periodicalDetailReducer, initialState } from './periodical-detail.reducer';
import {
  loadPeriodical,
  loadMonthIssues,
  loadMonthIssuesSuccess,
  loadMonthIssuesFailure,
  loadPeriodicalItemsSuccess,
} from './periodical-detail.actions';
import {
  selectMonthIssues,
  selectMonthLoading,
  selectAvailableYearsRootPid,
  selectCachedAvailableYears,
  selectAvailableYearsForCurrentDocument,
  selectPidFromAvailableYears,
} from './periodical-detail.selectors';
import { SolrSortDirections, SolrSortFields } from '../../../../core/solr/solr-helpers';

const VOLUME_A = 'uuid:volume-a';
const VOLUME_B = 'uuid:volume-b';

const issuesA = [{ pid: 'uuid:issue-a' }];
const issuesB = [{ pid: 'uuid:issue-b' }];

function loadPeriodicalAction(uuid: string) {
  return loadPeriodical({
    uuid,
    filters: [],
    page: 1,
    pageCount: 10000,
    sortBy: SolrSortFields.dateMin,
    sortDirection: SolrSortDirections.asc,
  });
}

describe('periodicalDetailReducer month issue cache scoping', () => {
  // Two different volumes share the same year/month coordinates. Keying the cache
  // on `year-month` alone made the second volume read the first one's issues.

  it('keeps issues of two volumes for the same month apart', () => {
    let state = periodicalDetailReducer(
      initialState,
      loadMonthIssuesSuccess({ parentVolumeUuid: VOLUME_A, year: 1999, month: 1, issues: issuesA }),
    );
    state = periodicalDetailReducer(
      state,
      loadMonthIssuesSuccess({ parentVolumeUuid: VOLUME_B, year: 1999, month: 1, issues: issuesB }),
    );

    expect(selectMonthIssues(VOLUME_A, 1999, 1).projector(state)).toEqual(issuesA);
    expect(selectMonthIssues(VOLUME_B, 1999, 1).projector(state)).toEqual(issuesB);
  });

  it('reports no cached issues for a volume that was never loaded', () => {
    const state = periodicalDetailReducer(
      initialState,
      loadMonthIssuesSuccess({ parentVolumeUuid: VOLUME_A, year: 1999, month: 1, issues: issuesA }),
    );

    expect(selectMonthIssues(VOLUME_B, 1999, 1).projector(state)).toEqual([]);
  });

  it('scopes the loading flag to the requested volume', () => {
    const state = periodicalDetailReducer(
      initialState,
      loadMonthIssues({ parentVolumeUuid: VOLUME_A, year: 1999, month: 1 }),
    );

    expect(selectMonthLoading(VOLUME_A, 1999, 1).projector(state)).toBe(true);
    expect(selectMonthLoading(VOLUME_B, 1999, 1).projector(state)).toBe(false);
  });

  it('clears the loading flag of the failing volume only', () => {
    let state = periodicalDetailReducer(
      initialState,
      loadMonthIssues({ parentVolumeUuid: VOLUME_A, year: 1999, month: 1 }),
    );
    state = periodicalDetailReducer(
      state,
      loadMonthIssues({ parentVolumeUuid: VOLUME_B, year: 1999, month: 1 }),
    );
    state = periodicalDetailReducer(
      state,
      loadMonthIssuesFailure({ parentVolumeUuid: VOLUME_A, year: 1999, month: 1, error: 'boom' }),
    );

    expect(selectMonthLoading(VOLUME_A, 1999, 1).projector(state)).toBe(false);
    expect(selectMonthLoading(VOLUME_B, 1999, 1).projector(state)).toBe(true);
  });

  it('drops the cached months when a different periodical is opened', () => {
    // Opening another periodical invalidates the calendar: its volume UUIDs differ,
    // and stale months must not survive into the new document's calendar.
    let state = periodicalDetailReducer(
      initialState,
      loadMonthIssuesSuccess({ parentVolumeUuid: VOLUME_A, year: 1999, month: 1, issues: issuesA }),
    );
    state = periodicalDetailReducer(state, loadPeriodicalAction('uuid:periodical-2'));

    expect(state.monthIssues).toEqual({});
    expect(state.monthLoading).toEqual({});
  });
});

describe('availableYears ownership', () => {
  // The volumes list is cached in the store and reused across navigations to save
  // a request. Without recording which periodical it was loaded for, opening
  // another title kept the previous one's volumes and the calendar resolved its
  // dates against them (issue #169).

  const ROOT_A = 'uuid:root-a';
  const ROOT_B = 'uuid:root-b';
  const yearsA = [{ year: '1867', exists: true, pid: VOLUME_A, model: 'periodicalvolume' } as any];
  const yearsB = [{ year: '1867', exists: true, pid: VOLUME_B, model: 'periodicalvolume' } as any];

  function withYears(rootPid: string, years: any[]) {
    return periodicalDetailReducer(
      initialState,
      loadPeriodicalItemsSuccess({ children: [], availableYears: years, availableYearsRootPid: rootPid }),
    );
  }

  it('records which periodical the cached years belong to', () => {
    const state = withYears(ROOT_A, yearsA);

    expect(selectAvailableYearsRootPid.projector(state)).toBe(ROOT_A);
    expect(selectCachedAvailableYears.projector(yearsA, ROOT_A)).toEqual({ years: yearsA, rootPid: ROOT_A });
  });

  it('replaces the years when another periodical is loaded', () => {
    let state = withYears(ROOT_A, yearsA);
    state = periodicalDetailReducer(
      state,
      loadPeriodicalItemsSuccess({ children: [], availableYears: yearsB, availableYearsRootPid: ROOT_B }),
    );

    expect(state.availableYears).toEqual(yearsB);
    expect(state.availableYearsRootPid).toBe(ROOT_B);
  });

  it('hides years belonging to another periodical from the open document', () => {
    // The window where the previous title's volumes are still in the store while
    // the new document is already displayed: the calendar must show nothing
    // rather than the wrong periodical's issues.
    expect(
      selectAvailableYearsForCurrentDocument.projector(
        { years: yearsA, rootPid: ROOT_A },
        { rootPid: ROOT_B } as any,
      ),
    ).toEqual([]);
  });

  it('exposes the years once they belong to the open document', () => {
    expect(
      selectAvailableYearsForCurrentDocument.projector(
        { years: yearsA, rootPid: ROOT_A },
        { rootPid: ROOT_A } as any,
      ),
    ).toEqual(yearsA);
  });

  it('resolves a year to a volume only within the open periodical', () => {
    const foreign = { years: yearsA, rootPid: ROOT_A };

    expect(selectPidFromAvailableYears('1867').projector(yearsA)).toBe(VOLUME_A);
    expect(
      selectPidFromAvailableYears('1867').projector(
        selectAvailableYearsForCurrentDocument.projector(foreign, { rootPid: ROOT_B } as any),
      ),
    ).toBe('');
  });
});
