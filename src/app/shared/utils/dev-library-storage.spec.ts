import {
  DEV_LIBRARY_ID_KEY,
  DEV_LIBRARY_URL_KEY,
  __resetDevLibraryStorageForTests,
  getDevLibraryValue,
  removeDevLibraryValue,
  setDevLibraryValue,
} from './dev-library-storage';

/**
 * Regression (#157): the library switch used to persist in localStorage, so a
 * single visit to a prefixed URL pinned the user to another library for good
 * and the base library's content pages (GDPR, FAQ) answered "page not found".
 */
describe('dev-library-storage', () => {
  function clearAll(): void {
    for (const key of [DEV_LIBRARY_ID_KEY, DEV_LIBRARY_URL_KEY]) {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    }
  }

  beforeEach(() => {
    clearAll();
    __resetDevLibraryStorageForTests();
  });

  afterEach(clearAll);

  it('stores the selection in sessionStorage, not localStorage', () => {
    setDevLibraryValue(DEV_LIBRARY_ID_KEY, 'mzk');

    expect(sessionStorage.getItem(DEV_LIBRARY_ID_KEY)).toBe('mzk');
    expect(localStorage.getItem(DEV_LIBRARY_ID_KEY)).toBeNull();
    expect(getDevLibraryValue(DEV_LIBRARY_ID_KEY)).toBe('mzk');
  });

  it('ignores and clears a selection left in localStorage by older builds', () => {
    localStorage.setItem(DEV_LIBRARY_ID_KEY, 'mzk');
    localStorage.setItem(DEV_LIBRARY_URL_KEY, 'https://kramerius.mzk.cz');

    expect(getDevLibraryValue(DEV_LIBRARY_ID_KEY)).toBeNull();
    expect(localStorage.getItem(DEV_LIBRARY_ID_KEY)).toBeNull();
    expect(localStorage.getItem(DEV_LIBRARY_URL_KEY)).toBeNull();
  });

  it('removes a stored value', () => {
    setDevLibraryValue(DEV_LIBRARY_URL_KEY, 'https://kramerius.mzk.cz');
    removeDevLibraryValue(DEV_LIBRARY_URL_KEY);

    expect(getDevLibraryValue(DEV_LIBRARY_URL_KEY)).toBeNull();
  });
});
