import {Component, inject, Input, OnInit} from '@angular/core';
import {NgForOf, NgIf} from '@angular/common';
import {TranslatePipe} from '@ngx-translate/core';
import {Author, Metadata, Publisher, PhysicalDescription} from '../../models/metadata.model';
import {ModsParserService} from '../../services/mods-parser.service';
import {DetailViewService} from '../../../modules/detail-view-page/services/detail-view.service';
import {APP_ROUTES_ENUM} from '../../../app.routes';
import {SearchService} from '../../services/search.service';
import {MetadataSectionItem} from './metadata-section-item/metadata-section-item';

@Component({
  selector: 'app-metadata-section',
	imports: [
		NgForOf,
		NgIf,
		TranslatePipe,
		MetadataSectionItem,
	],
  templateUrl: './metadata-section.html',
  styleUrl: './metadata-section.scss'
})
export class MetadataSection implements OnInit {

  data: Metadata | null = null;

  modsParser = inject(ModsParserService);
  searchService = inject(SearchService);

  @Input() uuid: string = '';

  @Input() showTitle: boolean = true;

  ngOnInit() {
    this.loadMetadata();
  }

  async loadMetadata() {
    this.modsParser
      .getMods(this.uuid)
      .then((metadata: Metadata) => {
        this.data = metadata;
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
    console.log('author clicked:', author);
    this.redirectToAuthor(author.name);
  };

  clickedKeyword = (keyword: string): void => {
    console.log('keyword clicked:', keyword);
    const url = `?fq=keywords.facet:${encodeURIComponent(keyword)}&keywords.facet_operator=OR`;
    this.searchService.redirectDirectlyToUrl(url);
  };

  clickedGenre = (genre: string): void => {
    console.log('genre clicked:', genre);
    const url = `?fq=genres:${encodeURIComponent(genre)}`;
    this.searchService.redirectDirectlyToUrl(url);
  };

  clickedDocumentType = (model: string): void => {
    console.log('document type clicked:', model);
    const url = `?fq=model:${encodeURIComponent(model)}`;
    this.searchService.redirectDirectlyToUrl(url);
  };

  redirectToAuthor(authorName: string) {
    // encode author name for URL
    authorName = encodeURIComponent(`${authorName}`);
    const url = `?fq=authors.facet:${authorName}&authors.facet_operator=OR`;
    this.searchService.redirectDirectlyToUrl(url);
  }

  objectKeys = Object.keys;

}
