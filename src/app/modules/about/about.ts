import {ChangeDetectorRef, Component, effect, inject} from '@angular/core';
import {AppTranslationService} from '../../shared/translation/app-translation.service';
import {ConfigService} from '../../core/config';
import {SafeHtmlPipe} from '../../shared/pipes/safe-html.pipe';

@Component({
  selector: 'app-about',
  imports: [
    SafeHtmlPipe,
  ],
  template: `
    <div class="about-container" [innerHTML]="aboutHtml | safeHtml"></div>
  `,
  styleUrl: './about.scss',
})
export class About {
  aboutHtml: string = '';
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
    const aboutUrl = this.configService.getConfig().contentPages?.aboutPage?.[lang]
      ?? this.configService.getConfig().contentPages?.aboutPage?.['en']
      ?? null;

    const [about] = await Promise.all([
      aboutUrl ? this.configService.loadHtmlContent(aboutUrl) : Promise.resolve('')
    ]);

    this.aboutHtml = about;
    this.htmlLoading = false;
    this.cdr.markForCheck();
  }

}
