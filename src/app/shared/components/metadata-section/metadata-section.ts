import {Component, inject, Input, OnInit, OnChanges, SimpleChanges} from '@angular/core';
import {NgForOf, NgIf} from '@angular/common';
import {TranslatePipe} from '@ngx-translate/core';
import {Author, Metadata, Publisher, PhysicalDescription, NoteInfo} from '../../models/metadata.model';
import {ModsParserService} from '../../services/mods-parser.service';
import {DetailViewService} from '../../../modules/detail-view-page/services/detail-view.service';
import {APP_ROUTES_ENUM} from '../../../app.routes';
import {SearchService} from '../../services/search.service';
import {MetadataSectionItem} from './metadata-section-item/metadata-section-item';
import {facetKeysEnum} from '../../../modules/search-results-page/const/facets';
import {Store} from '@ngrx/store';
import {selectDocumentDetail} from '../../state/document-detail/document-detail.selectors';
import {take} from 'rxjs';
import {AccessibilityBadgeComponent} from '../accessibility-badge/accessibility-badge.component';
import {DocumentInfoService} from '../../services/document-info.service';
import {UserService} from '../../services/user.service';
import {isDocumentPublic} from '../record-item/record-item.model';

@Component({
  selector: 'app-metadata-section',
  imports: [
    NgForOf,
    NgIf,
    TranslatePipe,
    MetadataSectionItem,
    AccessibilityBadgeComponent,
  ],
  templateUrl: './metadata-section.html',
  styleUrl: './metadata-section.scss'
})
export class MetadataSection implements OnInit, OnChanges {
  isPublic = false;

  data: Metadata | null = null;

  modsParser = inject(ModsParserService);
  searchService = inject(SearchService);
  documentInfoService = inject(DocumentInfoService);
  userService = inject(UserService);

  store = inject(Store);

  @Input() uuid: string = '';

  @Input() showTitle: boolean = true;

  ngOnInit() {
    this.loadMetadata();

    this.isPublic = isDocumentPublic(this.data?.licences || [], this.userService.licenses);
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['uuid'] && !changes['uuid'].firstChange) {
      this.loadMetadata();
    }
  }

  async loadMetadata() {
    // Load MODS data
    const modsData = await this.modsParser.getMods(this.uuid);

    // Get Solr data from store to supplement with model, accessibility, and license
    this.store.select(selectDocumentDetail).pipe(take(1)).subscribe(solrData => {
      console.log('modsData', modsData);
      console.log(solrData);
      if (solrData && solrData.uuid === this.uuid) {
        // Merge MODS data with Solr-specific fields
        this.data = {
          ...modsData,
          model: solrData.model,
          isPublic: solrData.isPublic,
          licence: solrData.licence,
          licences: solrData.licences
        };
      } else {
        // If no Solr data available, use MODS data only
        this.data = modsData;
      }
    });
  }

  // Helper methods for display functions
  getAuthorName = (author: Author): string => author.name;

  getPublisherFullDetail = (publisher: Publisher): string => publisher.fullDetail();

  getPhysicalDescription = (desc: PhysicalDescription): string => {
    let text = desc.extent;
    if (desc.note) {
      text += ` – ${desc.note}`;
    }
    return text;
  };

  getNotes(notes: NoteInfo[]) {
    const items = notes.map(note => note.text);
    return items;
  }

  getIsbn(): string | null {
    if (!this.data?.identifiers) {
      return null;
    }
    // Check for ISBN in different possible keys
    const isbn = this.data.identifiers['isbn'] ||
                 this.data.identifiers['ISBN'] ||
                 this.data.identifiers['id_isbn'];

    if (isbn) {
      return Array.isArray(isbn) ? isbn.join(', ') : String(isbn);
    }
    return null;
  }

  getIdentifiersWithoutIsbn(): {[key: string]: any} | undefined {
    if (!this.data?.identifiers) {
      return undefined;
    }
    const filtered: {[key: string]: any} = {};
    for (const key of Object.keys(this.data.identifiers)) {
      // Exclude ISBN-related keys
      if (!['isbn', 'ISBN', 'id_isbn'].includes(key)) {
        filtered[key] = this.data.identifiers[key];
      }
    }
    return Object.keys(filtered).length > 0 ? filtered : undefined;
  }

  // Click handlers
  clickedAuthor = (author: Author): void => {
    const url = `?fq=${facetKeysEnum.authors}:${author.name}&${facetKeysEnum.authors}_operator=OR`;
    this.searchService.redirectDirectlyToUrl(url);
  };

  clickedLanguage = (language: string): void => {
    const url = `?fq=${facetKeysEnum.languages}:${encodeURIComponent(language)}&${facetKeysEnum.languages}_operator=OR`;
    this.searchService.redirectDirectlyToUrl(url);
  }

  clickedKeyword = (keyword: string): void => {
    const url = `?fq=${facetKeysEnum.keywords}:${encodeURIComponent(keyword)}&${facetKeysEnum.keywords}_operator=OR`;
    this.searchService.redirectDirectlyToUrl(url);
  };

  clickedGenre = (genre: string): void => {
    const url = `?fq=${facetKeysEnum.genres}:${encodeURIComponent(genre)}&${facetKeysEnum.genres}_operator=OR`;
    this.searchService.redirectDirectlyToUrl(url);
  };

  clickedDocumentType = (model: string): void => {
    console.log('document type clicked:', model);
    const url = `?fq=model:${encodeURIComponent(model)}`;
    this.searchService.redirectDirectlyToUrl(url);
  };

  clickedAccessibility = (accessibility: string): void => {
    console.log('accessibility clicked:', accessibility);
    const url = `?fq=${facetKeysEnum.accessibility}:${encodeURIComponent(accessibility)}`;
    this.searchService.redirectDirectlyToUrl(url);
  };

  clickedLicense = (license: string): void => {
    console.log('license clicked:', license);
    const url = `?fq=${facetKeysEnum.license}:${encodeURIComponent(license)}&${facetKeysEnum.license}_operator=OR`;
    this.searchService.redirectDirectlyToUrl(url);
  };

  objectKeys = Object.keys;

}
