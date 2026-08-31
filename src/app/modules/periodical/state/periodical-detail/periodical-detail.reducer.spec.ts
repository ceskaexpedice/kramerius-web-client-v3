import { periodicalDetailReducer, initialState } from './periodical-detail.reducer';
import {
  loadPeriodical,
  loadMonthIssues,
  loadMonthIssuesSuccess,
  loadMonthIssuesFailure,
} from './periodical-detail.actions';
import { selectMonthIssues, selectMonthLoading } from './periodical-detail.selectors';
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
