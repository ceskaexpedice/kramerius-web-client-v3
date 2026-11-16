import { effect, inject, Injectable, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import { BreakpointService } from './breakpoint.service';
import { UiStateService } from './ui-state.service';
import { Page } from '../models/page.model';
import { Metadata } from '../models/metadata.model';
import { selectDocumentDetail } from '../state/document-detail/document-detail.selectors';
import type { SoundRecordGridControl } from '../components/toolbar-controls/toolbar-controls.component';

/**
 * Plain state of the document detail view — the open document, its pages and
 * which page/view is current — with no viewer logic attached.
 *
 * Split out of DetailViewService so code that only *reads* this state (search
 * results / collection / periodical sidebars, the music player, …) does not
 * have to import DetailViewService, which statically pulls in PdfService and
 * IIIFViewerService and with them ngx-extended-pdf-viewer + OpenSeadragon
 * (~1.3 MB) into every route that touches it.
 *
 * DetailViewService exposes these very signals under its historical names
 * (`_pages`, `_currentPageIndex`, `_articlePagePid`, `soundRecordingViewMode`),
 * so both see one shared state.
 */
@Injectable({ providedIn: 'root' })
export class DetailViewStateService {
  private store = inject(Store);
  private breakpointService = inject(BreakpointService);
  private uiStateService = inject(UiStateService);

  /** The document open in the detail view (from the document-detail store). */
  readonly document = toSignal(this.store.select(selectDocumentDetail), { initialValue: null as Metadata | null });

  readonly pages = signal<Page[]>([]);
  readonly currentPageIndex = signal<number>(0);
  /** PID of the page the current article is displayed on (via foster_parents). */
  readonly articlePagePid = signal<string | null>(null);

  /** Sound recordings: track list ('records') or its scans ('images'). */
  readonly soundRecordingViewMode = signal<SoundRecordGridControl>('records');

  constructor() {
    // Initialize the metadata sidebar state: open only where it sits beside the
    // content. On phones and portrait tablets it floats over the grid / page
    // image, so it starts collapsed behind the toolbar panel toggle.
    // (Moved here from DetailViewService. It runs once, when this root service
    // is first created — at startup, via MusicService — exactly as it did when
    // DetailViewService was created at startup.)
    let sidebarOverlays = this.breakpointService.rightSidebarOverlaysContent();
    this.uiStateService.setMetadataSidebarState(!sidebarOverlays);

    // Crossing the overlay threshold (e.g. rotating a tablet) re-applies the
    // default; within one band the user's own toggle is left alone.
    effect(() => {
      const overlays = this.breakpointService.rightSidebarOverlaysContent();
      if (overlays === sidebarOverlays) {
        return;
      }
      sidebarOverlays = overlays;
      untracked(() => this.uiStateService.setMetadataSidebarState(!overlays));
    });
  }

  /** PID of the page the viewer shows (an article's foster page wins). */
  get currentPagePid(): string | null {
    const articlePagePid = this.articlePagePid();
    if (articlePagePid) {
      return articlePagePid;
    }
    return this.pages()[this.currentPageIndex()]?.pid ?? null;
  }
}
