import { ChangeDetectorRef, Component, effect, inject } from '@angular/core';
import { ConfigService } from '../../config';
import { AppTranslationService } from '../../../shared/translation/app-translation.service';
import { SafeHtmlPipe } from '../../../shared/pipes/safe-html.pipe';

@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.scss',
  imports: [SafeHtmlPipe],
  standalone: true,
})
export class FooterComponent {
  private configService = inject(ConfigService);
  private translationService = inject(AppTranslationService);
  private cdr = inject(ChangeDetectorRef);

  footerHtml = '';

  constructor() {
    effect(() => {
      const lang = this.translationService.currentLanguage().code;
      this.loadFooter(lang);
    });
  }

  get hasFooter(): boolean {
    return !!this.footerHtml;
  }

  private async loadFooter(lang: string): Promise<void> {
    const url = this.configService.getFooterContentUrl(lang);
    this.footerHtml = url ? await this.configService.loadHtmlContent(url) : '';
    this.cdr.markForCheck();
  }
}
