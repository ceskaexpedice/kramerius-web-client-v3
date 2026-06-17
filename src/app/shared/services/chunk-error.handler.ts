import { ErrorHandler, Injectable } from '@angular/core';
import { isChunkLoadError, reloadOnceForChunkError } from './chunk-reload.util';

@Injectable()
export class ChunkErrorHandler implements ErrorHandler {

  handleError(error: unknown): void {
    if (isChunkLoadError(error)) {
      reloadOnceForChunkError();
      return;
    }
    console.error(error);
  }
}
