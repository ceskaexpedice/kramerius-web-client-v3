import { Component, inject, Input, OnInit, OnChanges, SimpleChanges, computed, ChangeDetectorRef, signal, DestroyRef } from '@angular/core';
import { NgForOf, NgIf } from '@angular/common';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Author, Metadata, Publisher, PhysicalDescription, NoteInfo, Location, InCollections } from '../../models/metadata.model';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { ModsParserService } from '../../services/mods-parser.service';
import { SearchService } from '../../services/search.service';
import { MetadataSectionItem } from './metadata-section-item/metadata-section-item';
import { CollapsibleContent } from './collapsible-content/collapsible-content';
import { facetKeysEnum } from '../../../modules/search-results-page/const/facets';
import { Store } from '@ngrx/store';
import { selectDocumentDetail } from '../../state/document-detail/document-detail.selectors';
import { distinctUntilChanged, firstValueFrom, map, take } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AccessibilityBadgeComponent } from '../accessibility-badge/accessibility-badge.component';
import { LicenseBadgeComponent } from '../license-badge/license-badge.component';
import { SolrService } from '../../../core/solr/solr.service';
import { LibraryContextService } from '../../services/library-context.service';
import { DocumentInfoService } from '../../services/document-info.service';
import { UserService } from '../../services/user.service';
import { isDocumentPublic } from '../record-item/record-item.model';
import { MatDialog } from '@angular/material/dialog';
import { MetadataDialogComponent } from '../../dialogs/metadata-dialog/metadata-dialog.component';
import { AuthorsDialogComponent } from '../../dialogs/authors-dialog/authors-dialog.component';

@Component({
  selector: 'app-metadata-section',
  imports: [
    NgForOf,
    NgIf,
    TranslatePipe,
    MetadataSectionItem,
    CollapsibleContent,
    AccessibilityBadgeComponent,
    LicenseBadgeComponent,
    RouterLink
  ],
  templateUrl: './metadata-section.html',
  styleUrl: './metadata-section.scss'
})
export class MetadataSection implements OnInit, OnChanges {
  // Use signal for data to enable reactive computed properties
  private _data = signal<Metadata | null>(null);
  get data() { return this._data(); }

  private _articleData = signal<Metadata | null>(null);
  get articleData() { return this._articleData(); }

  private _solrData = signal<Metadata | null>(null);

  private _childData = signal<Metadata | null>(null);
  get childData() { return this._childData(); }

  childExpanded = signal(true);

  toggleChild() {
    this.childExpanded.update(v => !v);
  }

  articleExpanded = signal(true);

  toggleArticle() {
    this.articleExpanded.update(v => !v);
  }

  // Computed isPublic that reacts to both data changes AND user license changes
  private _isPublic = computed(() => {
    const data = this._data();
    // Accessing userService.licenses (which is a signal getter) registers the dependency
    return isDocumentPublic(data?.licences || [], this.userService.licenses);
  });

  get isPublic() { return this._isPublic(); }

  get hasValidTitles(): boolean {
    return !!this.data?.titles.some(t => !!t.title);
  }

  modsParser = inject(ModsParserService);
  searchService = inject(SearchService);
  solrService = inject(SolrService);
  documentInfoService = inject(DocumentInfoService);
  userService = inject(UserService);
  private cdr = inject(ChangeDetectorRef);
  private translate = inject(TranslateService);

  private dialog = inject(MatDialog);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  store = inject(Store);
  private destroyRef = inject(DestroyRef);
  private libraryContext = inject(LibraryContextService);

  runtimeLicenses = computed(() => this.documentInfoService.getRuntimeLicenses());

  @Input() uuid: string = '';

  @Input() metadata: Metadata | null = null;

  @Input() showTitle: boolean = true;

  get articleViewLink(): any[] {
    return this.libraryContext.prependLibraryPrefix(['/view', this.uuid]);
  }

  ngOnInit() {
    this.loadMetadata();

    this.route.queryParams.pipe(
      takeUntilDestroyed(this.destroyRef),
      map(params => params['article']),
      distinctUntilChanged()
    ).subscribe(articleUuid => {
      this.loadArticle(articleUuid);
    });
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
    const solrData = await firstValueFrom(this.store.select(selectDocumentDetail).pipe(take(1)));
    if (solrData) {
      this._solrData.set(solrData);
    }

    let baseMods: any = { ...modsData };

    // If the document has a root.pid different from its own pid (e.g. periodicalvolume, periodicalitem),
    // show the root's MODS as the primary data and the child's own MODS in a subsection
    const rootPid = solrData?.rootPid;
    if (rootPid && rootPid !== this.uuid) {
      try {
        const rootMods = await this.modsParser.getMods(rootPid);
        if (rootMods) {
          // Save the child's own MODS for the subsection only if it has displayable data
          const child = modsData as any;
          const hasChildData = child && (
            child.dateStr ||
            child.authors?.length > 0 ||
            child.languages?.length > 0 ||
            child.locations?.length > 0 ||
            child.notes?.length > 0
          );
          this._childData.set(hasChildData ? child : null);
          // Use root MODS as primary, fill any gaps from child
          baseMods = { ...rootMods };
          this.mergeMissing(baseMods, modsData as any);
        }
      } catch (e) {
        console.warn('MetadataSection: failed to load root MODS for', rootPid, e);
      }
    } else {
      this._childData.set(null);
    }


    if (this.metadata) {
      this.mergeMissing(baseMods, this.metadata);
    }

    if (solrData && solrData.uuid === this.uuid) {
      const mergedData = {
        ...baseMods,
        model: solrData.model,
        isPublic: solrData.isPublic,
        licence: solrData.licence,
        licences: solrData.licences
      };
      this._data.set(mergedData);
    } else {
      this._data.set(baseMods);
    }

    this.cdr.markForCheck();
    this.loadCollectionNames();
  }

  async loadCollectionNames() {
    const data = this._data();
    if (!data || !data.inCollections || data.inCollections.length === 0) {
      return;
    }

    const uuidsToLoad = data.inCollections.filter(c => !c.name).map(c => c.uuid);
    if (uuidsToLoad.length === 0) return;

    try {
      const docs: any[] = await firstValueFrom(this.solrService.getDocumentsByPids(uuidsToLoad));
      const collectionMap = new Map<string, string>(docs.map((doc: any) => [doc.pid, doc['title.search']]));

      const newInCollections = data.inCollections.map(c => {
        const newC = { ...c };
        if (collectionMap.has(c.uuid)) {
          newC.name = collectionMap.get(c.uuid) || '';
        }
        return newC;
      });

      this._data.update(currentData => {
        if (!currentData) return null;
        return { ...currentData, inCollections: newInCollections } as Metadata;
      });

    } catch (e) {
      console.error('Failed to load collection names', e);
    }
  }

  async loadArticle(articleUuid: string | undefined) {
    if (articleUuid) {
      try {
        const articleMods = await this.modsParser.getMods(articleUuid);
        if (articleMods) {
          this._articleData.set(articleMods);
        }
      } catch (error) {
        console.error('Failed to load article MODS:', error);
      }
    } else {
      this._articleData.set(null);
    }
  }

  private isObject(v: any): boolean {
    return v && typeof v === 'object' && !Array.isArray(v);
  }

  private isEmpty(v: any): boolean {
    return v === null ||
      v === undefined ||
      (typeof v === 'string' && v.trim() === '') ||
      (Array.isArray(v) && v.length === 0) ||
      (this.isObject(v) && Object.keys(v).length === 0);
  }

  // Mutating merge: copy only missing/empty values from source into target
  private mergeMissing(target: any, source: any): any {
    if (!this.isObject(source) && !Array.isArray(source)) {
      // primitive
      if (this.isEmpty(target)) return source;
      return target;
    }

    if (Array.isArray(source)) {
      if (this.isEmpty(target)) return source.slice();
      return target;
    }

    if (!this.isObject(target)) {
      target = {};
    }

    for (const key of Object.keys(source)) {
      const sVal = source[key];
      const tVal = target[key];

      if (this.isObject(sVal)) {
        if (!this.isObject(tVal)) {
          target[key] = {};
        }
        this.mergeMissing(target[key], sVal);
      } else if (Array.isArray(sVal)) {
        if (this.isEmpty(tVal)) {
          target[key] = sVal.slice();
        }
      } else {
        if (this.isEmpty(tVal)) {
          target[key] = sVal;
        }
      }
    }

    return target;
  }


  private readonly identifierBaseUrls: Record<string, string> = {
    orcid: 'https://orcid.org/',
    ror: 'https://ror.org/',
  };

  private readonly identifierIcons: Record<string, string> = {
    orcid: '/img/logo/orcid.svg',
    ror: '/img/logo/ror.svg',
  };

  getIdentifierUrl(id: { type: string; value: string }): string | null {
    const base = this.identifierBaseUrls[id.type.toLowerCase()];
    return base ? base + id.value : null;
  }

  getIdentifierIcon(type: string): string | null {
    return this.identifierIcons[type.toLowerCase()] ?? null;
  }

  // Helper methods for display functions
  getAuthorName = (author: Author): string => author.name;


  getCollectionName = (item: any): string => item.name;

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

  getLocationLabel = (location: Location): string => {
    let parts = [];
    if (location.physicalLocation) {
      parts.push(this.translate.instant(location.physicalLocation));
    }
    if (location.shelfLocator) {
      parts.push(location.shelfLocator);
    }
    return parts.join(': ');
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

  getIdentifiersWithoutIsbn(): { [key: string]: any } | undefined {
    if (!this.data?.identifiers) {
      return undefined;
    }
    const filtered: { [key: string]: any } = {};
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
    const filterName = author.nameForFilter || author.name;
    const url = `?fq=${facetKeysEnum.authors}:${filterName}&${facetKeysEnum.authors}_operator=OR`;
    this.searchService.redirectDirectlyToUrl(url);
  };

  clickedSubjectNamePersonal = (subject: Author): void => {
    const filterName = subject.nameForFilter || subject.name;
    const url = `?fq=${facetKeysEnum.subjectNamesPersonal}:${encodeURIComponent(filterName)}&${facetKeysEnum.subjectNamesPersonal}_operator=OR`;
    this.searchService.redirectDirectlyToUrl(url);
  }

  clickedSubjectNameCorporate = (subject: Author): void => {
    const filterName = subject.nameForFilter || subject.name;
    const url = `?fq=${facetKeysEnum.subjectNamesCorporate}:${encodeURIComponent(filterName)}&${facetKeysEnum.subjectNamesCorporate}_operator=OR`;
    this.searchService.redirectDirectlyToUrl(url);
  }

  clickedSubjectTemporal = (subjectTemporal: string): void => {
    const url = `?fq=${facetKeysEnum.subjectTemporals}:${encodeURIComponent(subjectTemporal)}&${facetKeysEnum.subjectTemporals}_operator=OR`;
    this.searchService.redirectDirectlyToUrl(url);
  }

  clickedLanguage = (language: string): void => {
    const url = `?fq=${facetKeysEnum.languages}:${encodeURIComponent(language)}&${facetKeysEnum.languages}_operator=OR`;
    this.searchService.redirectDirectlyToUrl(url);
  }

  clickedLocation = (location: Location): void => {
    const url = `?fq=${facetKeysEnum.physical_locations}:${encodeURIComponent(location.physicalLocation)}&${facetKeysEnum.physical_locations}_operator=OR`;
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

  clickedGeoName = (geoName: string): void => {
    const url = `?fq=${facetKeysEnum.geographic_names}:${encodeURIComponent(geoName)}&${facetKeysEnum.geographic_names}_operator=OR`;
    this.searchService.redirectDirectlyToUrl(url);
  }

  clickedCollection = (collection: InCollections): void => {
    this.router.navigate(this.libraryContext.prependLibraryPrefix(['/collection', collection.uuid]));
  }

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

  openMetadataDialog() {
    this.dialog.open(MetadataDialogComponent, {
      data: {
        document: this._solrData() ?? this.data
      },
      autoFocus: false,
      restoreFocus: false,
      maxWidth: '1205px',
      width: '90%',
      maxHeight: '90vh'
    });
  }

  authorsDisplayLimit = 2;

  openAuthorsDialog() {
    this.dialog.open(AuthorsDialogComponent, {
      data: {
        authors: this.data?.authors ?? [],
        onAuthorClick: this.clickedAuthor
      },
      autoFocus: false,
      restoreFocus: false,
      maxWidth: '600px',
      width: '90%',
      maxHeight: '90vh'
    });
  }

  objectKeys = Object.keys;

  private readonly donatorUrlMap: Record<string, string> = {
    'norway': 'http://www.eeagrants.org',
    'k3tok5': 'https://www.nkp.cz/digitalni-knihovna/digitalni-knihovny/k3tok5',
    'eodopen': 'https://eodopen.eu/',
    'ilnorway': 'https://eeagrants.org',
    'dkrvo19-23': 'https://kramerius.nm.cz/dkrvo',
  };

  getDonatorImage(donator: string): string | null {
    return `/img/logo/donator/${donator.toLowerCase()}.png`;
  }

  getDonatorUrl(donator: string): string | null {
    return this.donatorUrlMap[donator.toLowerCase()] ?? null;
  }

}
