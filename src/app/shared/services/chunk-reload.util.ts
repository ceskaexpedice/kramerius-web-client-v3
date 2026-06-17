const RELOAD_KEY = 'chunk-reload-attempt';

const CHUNK_ERROR_PATTERNS = [
  'Loading chunk',
  'ChunkLoadError',
  'Failed to fetch dynamically imported module',
  'error loading dynamically imported module',
  'Importing a module script failed',
];

/**
 * Detects errors caused by a missing/stale lazy-loaded chunk. This happens when
 * a new app version is deployed while a user still has the old version open: the
 * hashed chunk filenames the old bundle references no longer exist on the server,
 * so the dynamic import() rejects.
 *
 * Unwraps nested errors (NavigationError.error, rejection.reason, etc.) so we
 * match regardless of which channel surfaced the failure.
 */
export function isChunkLoadError(error: unknown): boolean {
  const message = extractMessage(error);
  return CHUNK_ERROR_PATTERNS.some((pattern) => message.includes(pattern));
}

function extractMessage(error: unknown): string {
  if (error == null) {
    return '';
  }
  if (typeof error === 'string') {
    return error;
  }
  const err = error as { message?: string; reason?: unknown; error?: unknown };
  // Unwrap router NavigationError (.error) and unhandledrejection (.reason).
  const nested = err.reason ?? err.error;
  const nestedMessage = nested && nested !== error ? extractMessage(nested) : '';
  return `${err.message ?? ''} ${nestedMessage} ${String(error)}`;
}

/**
 * Reloads the page exactly once per session to recover from a stale-chunk error.
 * The guard prevents an infinite reload loop if the chunk is genuinely
 * unavailable (e.g. server misconfiguration rather than a fresh deploy).
 * The guard is cleared once the app bootstraps successfully (see AppLoaderService).
 */
export function reloadOnceForChunkError(): void {
  if (sessionStorage.getItem(RELOAD_KEY)) {
    console.error('ChunkReload: chunk load still failing after reload — aborting to avoid loop');
    return;
  }
  sessionStorage.setItem(RELOAD_KEY, '1');
  window.location.reload();
}

export const CHUNK_RELOAD_KEY = RELOAD_KEY;
