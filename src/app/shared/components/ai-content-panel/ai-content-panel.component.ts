import { Component, inject, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { AiPanelService } from '../../services/ai-panel.service';
import { FullscreenComponent } from '../fullscreen/fullscreen.component';
import { AiContentToolbarComponent } from './ai-content-toolbar/ai-content-toolbar.component';
import { AiLoadingComponent } from './ai-loading/ai-loading.component';

@Component({
  selector: 'app-ai-content-panel',
  standalone: true,
  imports: [CommonModule, TranslatePipe, FullscreenComponent, AiContentToolbarComponent, AiLoadingComponent],
  templateUrl: './ai-content-panel.component.html',
  styleUrl: './ai-content-panel.component.scss'
})
export class AiContentPanelComponent {
  aiPanelService = inject(AiPanelService);

  @ViewChild(FullscreenComponent) fullscreenComponent!: FullscreenComponent;

  close(): void {
    this.aiPanelService.close();
  }

  toggleFullscreen(): void {
    this.fullscreenComponent?.toggle();
  }

  getLoadingKey(): string {
    const type = this.aiPanelService.contentType();
    if (type === 'translation') return 'ai.loading-translation';
    if (type === 'summary') return 'ai.loading-summary';
    return 'ai.loading';
  }
}
