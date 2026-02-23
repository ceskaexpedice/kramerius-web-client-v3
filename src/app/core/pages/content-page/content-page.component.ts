import { Component, inject, effect, ChangeDetectorRef, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { SafeHtmlPipe } from '../../../shared/pipes/safe-html.pipe';
import { ConfigService } from '../../config/config.service';
import { AppTranslationService } from '../../../shared/translation/app-translation.service';
import { AuthService } from '../../auth/auth.service';
import { PageConfig } from '../../config/config.interfaces';
import { TranslatePipe } from '@ngx-translate/core';
import { MatCheckbox } from '@angular/material/checkbox';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-content-page',
  standalone: true,
  imports: [SafeHtmlPipe, TranslatePipe, MatCheckbox, FormsModule],
  templateUrl: './content-page.component.html',
  styleUrl: './content-page.component.scss'
})
export class ContentPageComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private configService = inject(ConfigService);
  private translationService = inject(AppTranslationService);
  private authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);

  pageConfig: PageConfig | undefined;
  htmlParts: string[] = [];
  loading = true;
  notFound = false;
  termsAgreed = false;
  isTermsPage = false;

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

  login(): void {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/';
    this.authService.login(returnUrl);
  }

  private async loadContent(): Promise<void> {
    if (!this.pageConfig) return;

    this.loading = true;
    this.isTermsPage = this.pageConfig.id === 'terms';
    const lang = this.translationService.currentLanguage().code;
    const rawContent = this.configService.getPageContentUrls(this.pageConfig.id, lang);

    if (rawContent.length) {
      this.htmlParts = await Promise.all(
        rawContent.map(url => this.configService.loadHtmlContent(url))
      );
    } else {
      this.htmlParts = [];
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
