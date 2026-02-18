import {ChangeDetectorRef, Component, effect, inject} from '@angular/core';
import {AppTranslationService} from '../../shared/translation/app-translation.service';
import {ConfigService} from '../../core/config';
import {SafeHtmlPipe} from '../../shared/pipes/safe-html.pipe';

@Component({
  selector: 'app-terms',
  imports: [
    SafeHtmlPipe,
  ],
  template: `
    <div class="terms-container" [innerHTML]="termsHtml | safeHtml"></div>
  `,
  styleUrl: './terms.scss',
})
export class Terms {
  termsHtml: string = '';
  htmlLoading = true;

  private translationService = inject(AppTranslationService);
  private configService = inject(ConfigService);
  private cdr = inject(ChangeDetectorRef);

  constructor() {
    // Reload HTML content when language changes
    effect(() => {
      this.translationService.currentLanguage(); // track the signal
      this.loadHtmlContent();
    });
  }

  private async loadHtmlContent(): Promise<void> {
    this.htmlLoading = true;

    const lang = this.translationService.currentLanguage().code;
    const termsUrl = this.configService.getPageContentUrl('terms', lang);

    this.termsHtml = termsUrl ? await this.configService.loadHtmlContent(termsUrl) : '';
    this.htmlLoading = false;
    this.cdr.markForCheck();
  }

}
