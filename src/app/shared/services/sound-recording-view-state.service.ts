import { Injectable, signal } from '@angular/core';
import type { SoundRecordGridControl } from '../components/toolbar-controls/toolbar-controls.component';

/**
 * Which view a sound recording shows: the track list ('records') or its scans
 * ('images').
 *
 * Lives in its own tiny service (instead of DetailViewService) so the eagerly
 * loaded music/playback code can switch the view without statically importing
 * DetailViewService — that one pulls in PdfService/IiifViewerService and with
 * them ngx-extended-pdf-viewer + OpenSeadragon (~2.4 MB) into the initial
 * bundle. DetailViewService re-exposes this signal as `soundRecordingViewMode`.
 */
@Injectable({ providedIn: 'root' })
export class SoundRecordingViewStateService {
  readonly mode = signal<SoundRecordGridControl>('records');
}
