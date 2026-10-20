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
import { escapeHtml } from '../../../../../shared/utils/escape-html';
import { linkifyText } from '../../../../../shared/utils/linkify';
import { normalizeForComparison } from '../../../../../shared/utils/normalize-text';
import { APP_ROUTES_ENUM } from '../../../../../app.routes';
import { CdkSourceService } from '../../../../../shared/services/cdk-source.service';
import { DocumentInfoService } from '../../../../../shared/services/document-info.service';


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
  protected documentInfoService = inject(DocumentInfoService);

  constructor() {
    // Reload HTML content when language changes. FAQ items are rebuilt too:
    // grouping matches on translated question text and merged answers embed
    // resolved translations, so both go stale on a language switch.
    // `effect()` runs before `ngOnInit`, and `loadHtmlContent()` now reads the detected
    // license list, so detection has to happen here rather than only in `ngOnInit`.
    effect(() => {
      this.translationService.currentLanguage(); // track the signal
      this.detectAllLicenseTypes();
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
    // A new document means new licenses, and the instructions are keyed off those,
    // so they must be re-fetched here as well.
    if (changes['metadata'] && !changes['metadata'].firstChange) {
      this.loadModsData();
      this.detectAllLicenseTypes();
      this.faqItems = this.getAllFaqItems();
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

        // The merged MODS metadata can introduce licenses the Solr record did not
        // carry, so the instructions are re-resolved against the updated list.
        this.detectAllLicenseTypes();
        this.faqItems = this.getAllFaqItems();
        this.loadHtmlContent();
        this.cdr.markForCheck();
      }
    } catch (error) {
      console.error('Error loading MODS data in Access Denied:', error);
    }
  }

  /**
   * Keeps only licenses that `config-licenses.json` actually defines, in the
   * configured display order.
   *
   * Documents in the index carry historical license ids the config no longer knows
   * about (e.g. `covid`). Such an id has no label, no instruction page and no access
   * semantics here, so listing it only surfaces the raw `access-denied.license-<id>`
   * translation key to the reader. Facet values are already narrowed the same way in
   * `facet-utils`; this screen follows suit.
   *
   * Filtering goes through the injected `ConfigService` rather than the module-level
   * `getConfiguredLicenses()` / `sortLicenses()` helpers in `solr-misc`, which read a
   * global reference set during app bootstrap.
   */
  private configuredLicenses(licenses: string[]): string[] {
    const order = this.configService.getLicenseOrder();
    const configured = new Set(this.configService.licenses.map(l => l.id));
    return licenses
      .filter(license => configured.has(license))
      .sort((a, b) => order.indexOf(a) - order.indexOf(b));
  }

  /**
   * Loads the instruction text of EVERY license blocking the document, not just the
   * highest-priority one.
   *
   * A document can require several licenses at once (e.g. `dnnto` + `onsite`), and each
   * describes a different route to the content — "log in with a partner library account"
   * vs. "come to the reading room". Showing only the primary license's instructions left
   * the reader with half the answer, so all of them are concatenated in the configured
   * license order. Two licenses may point at the same instruction page, so URLs are
   * deduplicated to avoid printing the same paragraph twice.
   *
   * The licenses come from `uniqueLicenseTypes` — the same list rendered above the
   * instructions — so the text always explains exactly the licenses the reader can see
   * named on screen. This replaced a `requiredLicenses` input carrying the current
   * page's runtime `providedByLicenses`, which can differ from the document's own
   * licenses and so could describe a license listed nowhere. `'other'`, the fallback
   * when nothing is recognised, has no configured instruction page, so it yields no text.
   */
  private async loadHtmlContent(): Promise<void> {
    this.htmlLoading = true;

    const licenseIds = this.uniqueLicenseTypes;
    const lang = this.translationService.currentLanguage().code;

    const instructionUrls = [...new Set(
      licenseIds
        .map(licenseId => this.configService.getInstructionPageUrl(licenseId, lang))
        .filter((url): url is string => !!url)
    )];
    const copyrightUrl = this.configService.getPageContentUrl('copyright', lang);

    const [instructions, copyright] = await Promise.all([
      Promise.all(instructionUrls.map(url => this.configService.loadHtmlContent(url))),
      copyrightUrl ? this.configService.loadHtmlContent(copyrightUrl) : Promise.resolve('')
    ]);

    // Each instruction page is a sentence fragment continuing the "To view it:"
    // lead-in ("log in with a partner library account", "view the document at a
    // terminal in ..."), so they cannot simply be concatenated: joined bare they
    // run together into one ungrammatical line with no cue that each describes a
    // different route to the content. Keep one paragraph per page.
    this.instructionHtml = this.resolveLoginLinks(
      instructions
        .filter(html => !!html)
        .map(html => `<p class="instruction-item">${html}</p>`)
        .join('')
    );
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

    const licenses = this.configuredLicenses(
      (this.metadata?.licences ?? []).map(license => this.getLicenseTypeFromString(license))
    );

    // Either the document carries no licenses at all, or every one it carries is
    // unknown to the config; both leave nothing specific to say, so fall back to the
    // generic "other" wording (label, FAQ and dialog all key off it).
    if (licenses.length === 0) {
      this.licenseTypes.add('other');
      this.uniqueLicenseTypes = ['other'];
      return;
    }

    licenses.forEach(license => this.licenseTypes.add(license));
    this.uniqueLicenseTypes = licenses;
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

  /** Message page key holding the license description shown in the info dialog. */
  private static readonly LICENSE_INFO_PAGE_KEY = 'unauthenticated';

  async openLicenseDialog(type: string) {
    // Prefer the license's own description from config (`messagePages`), which is
    // source-scoped: with a CDK member library selected this resolves to that
    // library's text (e.g. `onsite__mzk`) instead of the generic one. Only when no
    // message page is configured do we fall back to the static translation keys,
    // which lump every non-DNNT license together under `other`.
    const lang = this.translationService.currentLanguage().code;
    const url = this.configService.getMessagePageUrl(
      type, DocumentAccessDenied.LICENSE_INFO_PAGE_KEY, lang
    );

    if (url) {
      const content = await this.configService.loadHtmlContent(url);
      if (content) {
        this.dialog.open(LicenseInfoDialogComponent, {
          data: { title: this.licenseLabel(type), content, raw: true },
          autoFocus: false,
          panelClass: 'simple-dialog-panel'
        });
        return;
      }
    }

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
