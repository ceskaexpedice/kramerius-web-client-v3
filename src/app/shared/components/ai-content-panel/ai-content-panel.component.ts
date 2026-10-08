import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { AiPanelService } from '../../services/ai-panel.service';
import { DetailFullscreenService } from '../../services/detail-fullscreen.service';
import { AiContentToolbarComponent } from './ai-content-toolbar/ai-content-toolbar.component';
import { AiLoadingComponent } from './ai-loading/ai-loading.component';
import { DetailViewService } from '../../../modules/detail-view-page/services/detail-view.service';
import { NoTextCopyDirective } from '../../directives';
import { IIIFViewerService } from '../../services/iiif-viewer.service';
import { AltoService } from '../../services/alto.service';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-ai-content-panel',
  standalone: true,
  imports: [CommonModule, TranslatePipe, AiContentToolbarComponent, AiLoadingComponent, NoTextCopyDirective],
  templateUrl: './ai-content-panel.component.html',
  styleUrl: './ai-content-panel.component.scss',
  host: {
    '[class.ai-content-panel--constrained]': 'aiPanelService.showOriginal()'
  }
})
export class AiContentPanelComponent {
  aiPanelService = inject(AiPanelService);
  detailFullscreen = inject(DetailFullscreenService);
  private detailViewService = inject(DetailViewService, { optional: true });
  private altoService = inject(AltoService);
  private searchQuery = toSignal(inject(IIIFViewerService).searchQuery$, { initialValue: '' });

  /**
   * True when the document's license lets the reader see the text but not take
   * it (`text: false` — DNNTO). The panel still opens and renders; only
   * selecting and copying are blocked. Covers the AI outputs too: a translation
   * or summary of a text that may not be copied is the same text in another
   * form.
   */
  textCopyBlocked = computed(() => !(this.detailViewService?.isActionAllowed('text') ?? true));

  /**
   * The plain-text content split around the in-document search matches.
   *
   * Only the plain-text path needs this: it is what a page without ALTO shows
   * (`/ocr/text` fallback), and such a page has no boxes on the scan, so the
   * transcript is the only place the reader can see where the hit is. The ALTO
   * path renders `styledHtml` and keeps its highlights on the scan.
   */
  contentSegments = computed(() =>
    this.altoService.highlightPlainText(this.aiPanelService.content(), this.searchQuery())
  );

  close(): void {
    this.aiPanelService.close();
  }

  toggleFullscreen(): void {
    this.detailFullscreen.toggle();
  }

  getLoadingKey(): string {
    const type = this.aiPanelService.contentType();
    if (type === 'translation') return 'ai.loading-translation';
    if (type === 'summary') return 'ai.loading-summary';
    return 'ai.loading';
  }
}
