import { Component, Input, OnInit, inject, SimpleChanges, OnChanges, ChangeDetectorRef, effect, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { skip } from 'rxjs';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { Accordion, AccordionItemData } from '../../../../../shared/components/accordion/accordion';
import { SafeHtmlPipe } from '../../../../../shared/pipes/safe-html.pipe';
import { Metadata } from '../../../../../shared/models/metadata.model';
import { MatDialog } from '@angular/material/dialog';
import { LicenseInfoDialogComponent } from '../../../../../shared/dialogs/license-info-dialog/license-info-dialog.component';
import * as AuthActions from '../../../../../core/auth/store/auth.actions';
import { ModsParserService } from '../../../../../shared/services/mods-parser.service';
import { ConfigService } from '../../../../../core/config/config.service';
import { AppTranslationService } from '../../../../../shared/translation/app-translation.service';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { DNNTO_FAQ_ITEMS, DNNTT_FAQ_ITEMS, OTHER_FAQ_ITEMS } from './faq-data';
import { TranslateService } from '@ngx-translate/core';
import { selectPrimaryLicense, sortLicenses } from '../../../../../core/solr/solr-misc';
import { escapeHtml } from '../../../../../shared/utils/escape-html';
import { linkifyText } from '../../../../../shared/utils/linkify';
import { normalizeForComparison } from '../../../../../shared/utils/normalize-text';
import { APP_ROUTES_ENUM } from '../../../../../app.routes';
import { CdkSourceService } from '../../../../../shared/services/cdk-source.service';


interface FaqAnswer {
  licenseType: string;
  contentKey: string;
}

interface FaqGroup {
  titleKey: string;
  answers: FaqAnswer[];
}

@Component({
  selector: 'app-document-access-denied',
  imports: [CommonModule, TranslatePipe, Accordion, SafeHtmlPipe],
  templateUrl: './document-access-denied.html',
  styleUrls: ['./document-access-denied.scss', '../access-denied.scss'],
  standalone: true
})
export class DocumentAccessDenied implements OnInit, OnChanges {
  @Input() metadata: Metadata | null = null;
  @Input() requiredLicenses: string[] = [];

  faqItems: AccordionItemData[] = [];
  licenseTypes: Set<string> = new Set();
  uniqueLicenseTypes: string[] = [];

  // HTML content from config
  instructionHtml: string = '';
  copyrightHtml: string = '';
  htmlLoading = true;

  private router = inject(Router);
  private store = inject(Store);
  private modsParserService = inject(ModsParserService);
  private cdr = inject(ChangeDetectorRef);
  private translate = inject(TranslateService);
  private configService = inject(ConfigService);
  private translationService = inject(AppTranslationService);
  private dialog = inject(MatDialog);
  private cdkSource = inject(CdkSourceService);
  private destroyRef = inject(DestroyRef);

  constructor() {
    // Reload HTML content when language changes. FAQ items are rebuilt too:
    // grouping matches on translated question text and merged answers embed
    // resolved translations, so both go stale on a language switch.
    effect(() => {
      this.translationService.currentLanguage(); // track the signal
      this.loadHtmlContent();
      this.faqItems = this.getAllFaqItems();
      this.cdr.markForCheck();
    });

    // Switching the CDK member library changes which library's on-site instructions
    // apply ("find it at MZK" vs. "at NKP"), so re-resolve the HTML the same way a
    // language switch does. FAQ items are keyed by license type, not source, so they
    // do not need rebuilding here. `code$` is a BehaviorSubject that replays its
    // current value synchronously on subscribe; skip(1) drops that initial replay
    // because the language effect above already performs the first load, so only
    // actual source changes should trigger a reload here.
    this.cdkSource.code$
      .pipe(skip(1), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.loadHtmlContent();
        this.cdr.markForCheck();
      });
  }

  ngOnInit(): void {
    this.loadModsData();
    this.detectAllLicenseTypes();
    this.faqItems = this.getAllFaqItems();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['metadata'] && !changes['metadata'].firstChange) {
      this.loadModsData();
      this.detectAllLicenseTypes();
      this.faqItems = this.getAllFaqItems();
    }
    if (
      (changes['requiredLicenses'] && !changes['requiredLicenses'].firstChange)
    ) {
      this.loadHtmlContent();
    }
  }

  async loadModsData() {
    if (!this.metadata || !this.metadata.uuid) return;

    try {
      const modsMetadata = await this.modsParserService.getMods(this.metadata.uuid);
      if (modsMetadata && this.metadata) {
        const { mergeMetadata } = await import('../../../../../shared/models/metadata.model');
        const merged = mergeMetadata(this.metadata, modsMetadata);
        this.metadata = merged;

        this.detectAllLicenseTypes();
        this.faqItems = this.getAllFaqItems();
        this.cdr.markForCheck();
      }
    } catch (error) {
      console.error('Error loading MODS data in Access Denied:', error);
    }
  }

  private get primaryLicense(): string | null {
    return selectPrimaryLicense(this.requiredLicenses);
  }

  private async loadHtmlContent(): Promise<void> {
    this.htmlLoading = true;
    const licenseId = this.primaryLicense;

    if (!licenseId) {
      this.htmlLoading = false;
      return;
    }

    const lang = this.translationService.currentLanguage().code;
    const instructionUrl = this.configService.getInstructionPageUrl(licenseId, lang);
    const copyrightUrl = this.configService.getPageContentUrl('copyright', lang);

    const [instruction, copyright] = await Promise.all([
      instructionUrl ? this.configService.loadHtmlContent(instructionUrl) : Promise.resolve(''),
      copyrightUrl ? this.configService.loadHtmlContent(copyrightUrl) : Promise.resolve('')
    ]);

    this.instructionHtml = this.resolveLoginLinks(instruction);
    this.copyrightHtml = this.resolveLoginLinks(copyright);
    this.htmlLoading = false;
    this.cdr.markForCheck();
  }

  /**
   * The login links inside the config HTML are copied from the legacy
   * digitalniknihovna.cz portal: they point at `.../mzk/terms?redirect_path=${PATH}`,
   * where `${PATH}` is a placeholder the portal used to substitute server-side.
   * In this app that path 404s and the placeholder is never resolved, so rewrite
   * both to the app's own terms route with the current location as the returnUrl.
   */
  private resolveLoginLinks(html: string): string {
    if (!html) return html;

    const returnUrl = encodeURIComponent(this.router.url);
    const target = `/${APP_ROUTES_ENUM.PAGES}/terms?returnUrl=${returnUrl}`;

    // Match both the relative (`/mzk/terms?...`) and absolute
    // (`https://www.digitalniknihovna.cz/mzk/terms?...`) forms, with the
    // literal `${PATH}` placeholder still in place.
    return html.replace(
      /(?:https?:\/\/[^/"']*)?\/mzk\/terms\?redirect_path=\$\{PATH\}/g,
      target
    );
  }

  detectAllLicenseTypes(): void {
    // Reset first: this runs again on metadata changes, and leftover types from
    // a previously viewed document would leak into the licenses shown here.
    this.licenseTypes.clear();

    if (!this.metadata || !this.metadata.licences || this.metadata.licences.length === 0) {
      this.licenseTypes.add('other');
      this.uniqueLicenseTypes = ['other'];
      return;
    }

    this.metadata.licences.forEach(license => {
      const licenseType = this.getLicenseTypeFromString(license);
      this.licenseTypes.add(licenseType);
    });

    this.uniqueLicenseTypes = sortLicenses(Array.from(this.licenseTypes));
  }

  getLicenseTypeFromString(license: string): string {
    const lowerLicense = license.toLowerCase();

    return lowerLicense;
  }

  getAllFaqItems(): AccordionItemData[] {
    // Different license types share several identically worded questions, but
    // their answers differ (e.g. remote vs. on-site access). Group by the
    // translated question text so each one is asked once, and collect every
    // license's answer underneath it.
    const groups: FaqGroup[] = [];
    const groupsByQuestion = new Map<string, FaqGroup>();

    this.uniqueLicenseTypes.forEach(type => {
      this.getFaqItemsForLicenseType(type).forEach(item => {
        const key = normalizeForComparison(this.translate.instant(item.title));
        const existing = groupsByQuestion.get(key);

        if (existing) {
          existing.answers.push({ licenseType: type, contentKey: item.content });
        } else {
          const group: FaqGroup = {
            titleKey: item.title,
            answers: [{ licenseType: type, contentKey: item.content }]
          };
          groups.push(group);
          groupsByQuestion.set(key, group);
        }
      });
    });

    return groups.map((group, i) => ({
      id: i + 1,
      index: i + 1,
      title: group.titleKey,
      isOpen: i === 0,
      // A single answer stays a plain translation key so the accordion keeps
      // translating it; merged answers must be pre-resolved and labelled.
      // Either way the answer text can contain a bare URL or e-mail, so it is
      // linkified — up front here, or by the accordion for the key form.
      ...(group.answers.length === 1
        ? { content: group.answers[0].contentKey, linkify: true }
        : { content: this.buildMergedAnswer(group.answers), allowHtml: true })
    }));
  }

  private buildMergedAnswer(answers: FaqAnswer[]): string {
    return answers
      .map(answer => {
        const label = this.licenseLabel(answer.licenseType);
        const text = this.translate.instant(answer.contentKey);
        return `<p class="faq-answer"><span class="faq-answer__license">${escapeHtml(label)}</span>${linkifyText(text)}</p>`;
      })
      .join('');
  }

  getFaqItemsForLicenseType(type: string): AccordionItemData[] {
    switch (type) {
      case 'dnnto':
        return DNNTO_FAQ_ITEMS;
      case 'dnntt':
        return DNNTT_FAQ_ITEMS;
      default:
        return OTHER_FAQ_ITEMS;
    }
  }

  getAllLicenseNames(): string[] {
    if (this.metadata && this.metadata.licences && this.metadata.licences.length > 0) {
      return this.metadata.licences.map(license => `access-denied.license-${license}`);
    }
    return ['access-denied.license-default'];
  }

  /**
   * License label for display. The config label is only used when a source-scoped
   * variant is actually in play (e.g. "Studovna MZK" instead of "Studovna" once a CDK
   * member library is selected); otherwise the i18n translation is the label source,
   * exactly as before this feature existed. This matters off CDK / with no source
   * selected — e.g. a standalone MZK instance — where config labels can differ
   * materially in wording from the i18n labels (`access-denied.license-*`), and
   * behaviour there must stay bit-for-bit identical to before.
   *
   * Resolve twice — source-scoped and base (ignoreSource) — and compare: if they
   * differ, a variant applies and its config label wins; if they match, there is no
   * variant to justify preferring config, so fall back to the i18n key. `getLocalizedLabel`
   * returns the key itself when nothing is configured, which is the signal to fall back
   * to the existing translation key in that case too.
   */
  licenseLabel(type: string): string {
    const lang = this.translationService.currentLanguage().code;
    const configured = this.configService.getLocalizedLabel('license', type, lang);
    const base = this.configService.getLocalizedLabel('license', type, lang, true);
    const variantInPlay = configured !== type && configured !== base;
    return variantInPlay
      ? configured
      : this.translate.instant(`access-denied.license-${type}`);
  }

  getFaqTitle(): string {
    const type = this.uniqueLicenseTypes[0];

    if (type === 'dnnto' || type === 'dnntt') {
      return `access-denied.faq-title-${type}`;
    }
    return 'access-denied.faq-title-other';
  }

  login() {
    const currentUrl = this.router.url;
    this.store.dispatch(AuthActions.login({ returnUrl: currentUrl }));
  }

  hasDnntLicense(): boolean {
    return this.licenseTypes.has('dnnto') || this.licenseTypes.has('dnntt');
  }

  openLicenseDialog(type: string) {
    this.dialog.open(LicenseInfoDialogComponent, {
      data: {
        title: `access-denied.dialog.${this.getType(type)}.title`,
        content: `access-denied.dialog.${this.getType(type)}.content`
      },
      autoFocus: false,
      panelClass: 'simple-dialog-panel'
    });
  }

  getType(type: string) {
    switch (type) {
      case 'dnntt': return 'dnntt';
      case 'dnnto': return 'dnnto';
      default: return 'other';
    }
  }
}
