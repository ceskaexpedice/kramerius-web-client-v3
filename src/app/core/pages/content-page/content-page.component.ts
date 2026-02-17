import { Component, inject, effect, ChangeDetectorRef, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { SafeHtmlPipe } from '../../../shared/pipes/safe-html.pipe';
import { ConfigService } from '../../config/config.service';
import { AppTranslationService } from '../../../shared/translation/app-translation.service';
import { PageConfig } from '../../config/config.interfaces';
import {TranslatePipe} from '@ngx-translate/core';

@Component({
  selector: 'app-content-page',
  standalone: true,
  imports: [SafeHtmlPipe, TranslatePipe],
  templateUrl: './content-page.component.html',
  styleUrl: './content-page.component.scss'
})
export class ContentPageComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private configService = inject(ConfigService);
  private translationService = inject(AppTranslationService);
  private cdr = inject(ChangeDetectorRef);

  pageConfig: PageConfig | undefined;
  htmlContent = '';
  loading = true;
  notFound = false;

  constructor() {
    effect(() => {
      this.translationService.currentLanguage();
      if (this.pageConfig) {
        this.loadContent();
      }
    });
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const pageId = params.get('pageId');
      this.pageConfig = pageId ? this.configService.getPage(pageId) : undefined;
      this.notFound = !this.pageConfig;

      if (this.pageConfig) {
        this.loadContent();
      } else {
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  private async loadContent(): Promise<void> {
    if (!this.pageConfig) return;

    this.loading = true;
    const lang = this.translationService.currentLanguage().code;
    const fallbackLang = this.configService.i18n.fallbackLanguage ?? 'en';
    const url = this.pageConfig.content[lang] ?? this.pageConfig.content[fallbackLang];

    if (url) {
      this.htmlContent = await this.configService.loadHtmlContent(url);
    } else {
      this.htmlContent = '';
    }

    this.loading = false;
    this.cdr.markForCheck();
    this.scrollToFragment();
  }

  private scrollToFragment(): void {
    const fragment = this.route.snapshot.fragment;
    if (!fragment) return;

    setTimeout(() => {
      document.getElementById(fragment)?.scrollIntoView({ behavior: 'smooth' });
    });
  }
}
