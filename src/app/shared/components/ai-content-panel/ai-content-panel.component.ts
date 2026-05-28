import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { AiPanelService } from '../../services/ai-panel.service';
import { DetailFullscreenService } from '../../services/detail-fullscreen.service';
import { AiContentToolbarComponent } from './ai-content-toolbar/ai-content-toolbar.component';
import { AiLoadingComponent } from './ai-loading/ai-loading.component';

@Component({
  selector: 'app-ai-content-panel',
  standalone: true,
  imports: [CommonModule, TranslatePipe, AiContentToolbarComponent, AiLoadingComponent],
  templateUrl: './ai-content-panel.component.html',
  styleUrl: './ai-content-panel.component.scss',
  host: {
    '[class.ai-content-panel--constrained]': 'aiPanelService.showOriginal()'
  }
})
export class AiContentPanelComponent {
  aiPanelService = inject(AiPanelService);
  detailFullscreen = inject(DetailFullscreenService);

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
