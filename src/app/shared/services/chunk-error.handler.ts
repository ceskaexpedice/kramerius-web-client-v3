import { ErrorHandler, Injectable } from '@angular/core';

const RELOAD_KEY = 'chunk-reload-attempt';

const CHUNK_ERROR_PATTERNS = [
  'Loading chunk',
  'ChunkLoadError',
  'Failed to fetch dynamically imported module',
  'error loading dynamically imported module',
];

@Injectable()
export class ChunkErrorHandler implements ErrorHandler {

  handleError(error: unknown): void {
    if (this.isChunkError(error)) {
      this.reloadOnce();
      return;
    }
    console.error(error);
  }

  private isChunkError(error: unknown): boolean {
    const message =
      (error as { message?: string })?.message ??
      (typeof error === 'string' ? error : String(error));
    return CHUNK_ERROR_PATTERNS.some((pattern) => message.includes(pattern));
  }

  private reloadOnce(): void {
    if (sessionStorage.getItem(RELOAD_KEY)) {
      console.error('ChunkErrorHandler: chunk load failed after reload — aborting to avoid loop');
      return;
    }
    sessionStorage.setItem(RELOAD_KEY, '1');
    window.location.reload();
  }
}
