import { Component, Input, OnInit, inject, SimpleChanges, OnChanges, ChangeDetectorRef, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
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


@Component({
  selector: 'app-document-access-denied',
  imports: [CommonModule, TranslateModule, Accordion, SafeHtmlPipe],
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

  constructor() {
    // Reload HTML content when language changes
    effect(() => {
      this.translationService.currentLanguage(); // track the signal
      this.loadHtmlContent();
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

    this.instructionHtml = instruction;
    this.copyrightHtml = copyright;
    this.htmlLoading = false;
    this.cdr.markForCheck();
  }

  detectAllLicenseTypes(): void {
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
    const allItems: AccordionItemData[] = [];
    let indexCounter = 1;

    this.uniqueLicenseTypes.forEach(type => {
      const items = this.getFaqItemsForLicenseType(type);
      items.forEach(item => {
        allItems.push({
          ...item,
          id: indexCounter,
          index: indexCounter++,
          isOpen: indexCounter === 2
        });
      });
    });

    return allItems;
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
      autoFocus: false
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
