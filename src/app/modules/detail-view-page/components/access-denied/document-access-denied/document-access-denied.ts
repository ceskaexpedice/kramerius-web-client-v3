import { Component, Input, OnInit, inject, SimpleChanges, OnChanges, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { Accordion, AccordionItemData } from '../../../../../shared/components/accordion/accordion';
import { Metadata } from '../../../../../shared/models/metadata.model';
import { MatDialog } from '@angular/material/dialog';
import { LicenseInfoDialogComponent } from '../../../../../shared/dialogs/license-info-dialog/license-info-dialog.component';
import * as AuthActions from '../../../../../core/auth/store/auth.actions';
import { ModsParserService } from '../../../../../shared/services/mods-parser.service';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { DNNTO_FAQ_ITEMS, DNNTT_FAQ_ITEMS, OTHER_FAQ_ITEMS } from './faq-data';
import { TranslateService } from '@ngx-translate/core';


@Component({
  selector: 'app-document-access-denied',
  imports: [CommonModule, TranslateModule, Accordion],
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
  private router = inject(Router);
  private store = inject(Store);
  private modsParserService = inject(ModsParserService);
  private cdr = inject(ChangeDetectorRef);
  private translate = inject(TranslateService);

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
  }

  async loadModsData() {
    if (!this.metadata || !this.metadata.uuid) return;

    try {
      const modsMetadata = await this.modsParserService.getMods(this.metadata.uuid);
      if (modsMetadata && this.metadata) {
        // Dynamically import mergeMetadata to avoid circular dependency issues if any
        const { mergeMetadata } = await import('../../../../../shared/models/metadata.model');
        const merged = mergeMetadata(this.metadata, modsMetadata);
        this.metadata = merged;

        // Refresh view dependent data
        this.detectAllLicenseTypes();
        this.faqItems = this.getAllFaqItems(); // Re-generate items if needed
        this.cdr.markForCheck();
      }
    } catch (error) {
      console.error('Error loading MODS data in Access Denied:', error);
    }
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

    this.uniqueLicenseTypes = Array.from(this.licenseTypes);
  }

  getLicenseTypeFromString(license: string): string {
    const lowerLicense = license.toLowerCase();

    return lowerLicense;
  }

  getAllFaqItems(): AccordionItemData[] {
    const allItems: AccordionItemData[] = [];
    let indexCounter = 1;

    // Combine FAQ items from all license types
    this.uniqueLicenseTypes.forEach(type => {
      const items = this.getFaqItemsForLicenseType(type);
      items.forEach(item => {
        allItems.push({
          ...item,
          id: indexCounter, // Overwrite ID to ensure uniqueness
          index: indexCounter++,
          isOpen: indexCounter === 2 // First item (index 1) is open
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

  getViewingInstructionsForAllTypes(): { key: string; params?: any }[] {
    const instructions: { key: string; params?: any }[] = [];

    this.uniqueLicenseTypes.forEach(type => {
      switch (type) {
        case 'dnnto':
        case 'dnntt':
          if (!instructions.some(i => i.key === 'access-denied.for-viewing-dnnt')) {
            instructions.push({ key: 'access-denied.for-viewing-dnnt' });
          }
          break;
        default:
          let addedInstruction = false;
          if (this.metadata && this.metadata.locations && this.metadata.locations.length > 0) {
            this.metadata.locations.forEach(loc => {
              if (loc.physicalLocation) {
                instructions.push({
                  key: 'access-denied.for-viewing-other-prefix',
                  params: { location: this.translate.instant(loc.physicalLocation) }
                });
                addedInstruction = true;
              }
            });
          }

          if (!addedInstruction) {
            instructions.push({
              key: 'access-denied.for-viewing-other-prefix',
              params: { location: '' }
            });
          }
          break;
      }
    });

    return instructions;
  }

  onLocationClick() {
    console.log('Location clicked');
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

  private dialog = inject(MatDialog);

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
