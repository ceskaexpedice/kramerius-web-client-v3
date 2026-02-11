import { Component, Input, OnChanges, SimpleChanges, inject, ChangeDetectorRef, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { SafeHtmlPipe } from '../../../../../shared/pipes/safe-html.pipe';
import { ConfigService } from '../../../../../core/config/config.service';
import { AppTranslationService } from '../../../../../shared/translation/app-translation.service';
import { Metadata } from '../../../../../shared/models/metadata.model';
import * as AuthActions from '../../../../../core/auth/store/auth.actions';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';

@Component({
  selector: 'app-document-access-denied-html',
  imports: [CommonModule, TranslateModule, SafeHtmlPipe],
  templateUrl: './document-access-denied-html.html',
  styleUrls: ['./document-access-denied-html.scss', '../access-denied.scss'],
  standalone: true
})
export class DocumentAccessDeniedHtml implements OnChanges {
  @Input() metadata: Metadata | null = null;
  @Input() requiredLicenses: string[] = [];
  @Input() pageKey: string = 'default';

  messageHtml: string = '';
  instructionHtml: string = '';
  copyrightHtml: string = '';
  loading = true;

  private configService = inject(ConfigService);
  private translationService = inject(AppTranslationService);
  private router = inject(Router);
  private store = inject(Store);
  private cdr = inject(ChangeDetectorRef);

  constructor() {
    // Reload content when language changes
    effect(() => {
      this.translationService.currentLanguage(); // track the signal
      this.loadContent();
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (
      (changes['requiredLicenses'] && !changes['requiredLicenses'].firstChange) ||
      (changes['pageKey'] && !changes['pageKey'].firstChange)
    ) {
      this.loadContent();
    }
  }

  get primaryLicense(): string | null {
    return this.requiredLicenses.length > 0 ? this.requiredLicenses[0] : null;
  }

  private async loadContent(): Promise<void> {
    this.loading = true;
    const licenseId = this.primaryLicense;

    console.log(this.requiredLicenses)
    if (!licenseId) {
      this.loading = false;
      return;
    }

    const lang = this.translationService.currentLanguage().code;

    const messageUrl = this.configService.getMessagePageUrl(licenseId, this.pageKey, lang);
    const instructionUrl = this.configService.getInstructionPageUrl(licenseId, lang);
    const fallbackLang = this.configService.i18n.fallbackLanguage ?? 'en';
    const copyrightUrl = this.configService.getConfig().contentPages?.copyrightedText?.[lang]
      ?? this.configService.getConfig().contentPages?.copyrightedText?.[fallbackLang]
      ?? null;

    const [message, instruction, copyright] = await Promise.all([
      messageUrl ? this.configService.loadHtmlContent(messageUrl) : Promise.resolve(''),
      instructionUrl ? this.configService.loadHtmlContent(instructionUrl) : Promise.resolve(''),
      copyrightUrl ? this.configService.loadHtmlContent(copyrightUrl) : Promise.resolve('')
    ]);

    this.messageHtml = message;
    this.instructionHtml = instruction;
    this.copyrightHtml = copyright;
    this.loading = false;
    this.cdr.markForCheck();
  }

  get hasContent(): boolean {
    return this.messageHtml.trim().length > 0;
  }

  login(): void {
    const currentUrl = this.router.url;
    this.store.dispatch(AuthActions.login({ returnUrl: currentUrl }));
  }
}
