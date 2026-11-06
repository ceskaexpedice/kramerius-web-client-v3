/**
 * Storage for the internal library switch (`features.librarySwitch`).
 *
 * The selected library is kept in sessionStorage, not localStorage: a switch
 * lasts for the current tab only, and a new tab or browser session always
 * starts on the base library. With localStorage a single visit to a prefixed
 * URL (e.g. `/mzk/view/...`) pinned the user to that library for good, and
 * only clearing site data by hand brought the base library — and its content
 * pages (GDPR, FAQ, …) — back. See issue #157.
 */
export const DEV_LIBRARY_ID_KEY = 'CDK_DEV_KRAMERIUS_ID';
export const DEV_LIBRARY_URL_KEY = 'CDK_DEV_BASE_URL';

type DevLibraryKey = typeof DEV_LIBRARY_ID_KEY | typeof DEV_LIBRARY_URL_KEY;

let legacyCleared = false;

/** Drop values older builds persisted to localStorage, so nobody stays stuck on them. */
function clearLegacyLocalStorage(): void {
  if (legacyCleared) return;
  legacyCleared = true;
  try {
    localStorage.removeItem(DEV_LIBRARY_ID_KEY);
    localStorage.removeItem(DEV_LIBRARY_URL_KEY);
  } catch {
    // Storage unavailable (private mode, blocked site data) — nothing to clean.
  }
}

export function getDevLibraryValue(key: DevLibraryKey): string | null {
  clearLegacyLocalStorage();
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

export function setDevLibraryValue(key: DevLibraryKey, value: string): void {
  clearLegacyLocalStorage();
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // Storage unavailable — the switch simply won't persist across reloads.
  }
}

export function removeDevLibraryValue(key: DevLibraryKey): void {
  clearLegacyLocalStorage();
  try {
    sessionStorage.removeItem(key);
  } catch {
    // Storage unavailable — nothing stored.
  }
}

/** Test seam: re-arm the one-time legacy cleanup between specs. */
export function __resetDevLibraryStorageForTests(): void {
  legacyCleared = false;
}
