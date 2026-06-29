import { Component, inject, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, computed, ChangeDetectorRef, signal, DestroyRef, effect } from '@angular/core';
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
import { reloadPagesForCdkCollection } from '../../state/document-detail/document-detail.actions';
import { selectAvailableYears } from '../../../modules/periodical/state/periodical-detail/periodical-detail.selectors';
import { distinctUntilChanged, firstValueFrom, map, take } from 'rxjs';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { AccessibilityBadgeComponent } from '../accessibility-badge/accessibility-badge.component';
import { LicenseBadgeComponent } from '../license-badge/license-badge.component';
import { ModelBadgeComponent } from '../model-badge/model-badge.component';
import { SolrService } from '../../../core/solr/solr.service';
import { CdkSourceService } from '../../services/cdk-source.service';
import { LibraryContextService } from '../../services/library-context.service';
import { DocumentInfoService } from '../../services/document-info.service';
import { UserService } from '../../services/user.service';
import { isDocumentPublic } from '../record-item/record-item.model';
import { MatDialog } from '@angular/material/dialog';
import { MetadataDialogComponent } from '../../dialogs/metadata-dialog/metadata-dialog.component';
import { AuthorsDialogComponent } from '../../dialogs/authors-dialog/authors-dialog.component';
import { SelectComponent } from '../select/select.component';
import { SafeHtmlPipe } from '../../pipes/safe-html.pipe';
import { ConfigService } from '../../../core/config/config.service';
import { pickCdkCollection } from '../../utils/cdk-collection';
import { RecordHandlerService } from '../../services/record-handler.service';
import { DocumentTypeEnum } from '../../../modules/constants/document-type';
import { CdkTooltipDirective } from '../../directives';
import { AppTranslationService } from '../../translation/app-translation.service';
import { getLanguageFallbackChain } from '../../translation/translation-fallback-chain';
import { SOLR_LANG_TO_APP_LANG, resolveLocalizedValue } from '../../utils/language-utils';

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
    ModelBadgeComponent,
    RouterLink,
    SelectComponent,
    SafeHtmlPipe,
    CdkTooltipDirective
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

  // Unit count of the root multivolume monograph, fetched for monographunit documents
  // so the badge can show the root "Knihy (n)" instead of the unit "Díl".
  private _rootUnitCount = signal<number>(0);

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

  /**
   * Picks the best item from a language-tagged list, preferring the current UI
   * language, then Slovak, Czech, English, and finally the first available entry.
   * `langOf` maps an item to a normalized app language code ('sk' | 'cs' | 'en' | …).
   */
  private pickLocalized<T>(items: T[], langOf: (item: T) => string): T[] {
    if (!items || items.length <= 1) return items ?? [];

    const current = this.appTranslation.currentLanguage().code;
    const fallbackChain = getLanguageFallbackChain(current);

    for (const lang of fallbackChain) {
      const matches = items.filter(item => langOf(item) === lang);
      if (matches.length) return matches;
    }

    // Nothing matched the preferred languages – fall back to the first entry.
    return [items[0]];
  }

  /**
   * Collection titles tagged in multiple languages: show only the entry matching
   * the current language (with sk → cs → en fallback) instead of every language.
   */
  get localizedTitles() {
    const titles = this.data?.titles ?? [];
    if (!this.collectionsMode) return titles;
    return this.pickLocalized(titles, t => SOLR_LANG_TO_APP_LANG[t.lang] ?? t.lang);
  }

  /**
   * The collection's main title resolved against the current UI language. Reads the
   * per-language `collectionTitles` map live so the heading re-renders on language
   * switch (unlike the parse-time `mainTitle`). Falls back to `mainTitle` for
   * non-collections or when no localized title is available.
   */
  get localizedMainTitle(): string {
    const data = this.data;
    if (!data) return '';
    if (this.collectionsMode && data.collectionTitles) {
      const current = this.appTranslation.currentLanguage().code;
      const resolved = resolveLocalizedValue(data.collectionTitles, current);
      if (resolved) return resolved;
    }
    return data.mainTitle || data.titles[0]?.title || '';
  }

  /**
   * Collection notes/description tagged in multiple languages: show only the entry
   * matching the current language (with sk → cs → en fallback).
   */
  get localizedNotes(): NoteInfo[] {
    const notes = this.data?.notes ?? [];
    if (!this.collectionsMode) return notes;
    return this.pickLocalized(notes, n => n.lang);
  }

  /**
   * Collection abstracts tagged in multiple languages: show only the entry matching
   * the current language (with sk → cs → en fallback). Falls back to the plain
   * `abstracts` list when language-tagged abstracts aren't available.
   */
  get localizedAbstracts(): string[] {
    const infos = this.data?.abstractInfos ?? [];
    if (!this.collectionsMode || infos.length === 0) {
      return this.data?.abstracts ?? [];
    }
    return this.pickLocalized(infos, a => a.lang).map(a => a.text);
  }

  modsParser = inject(ModsParserService);
  searchService = inject(SearchService);
  solrService = inject(SolrService);
  private cdkSource = inject(CdkSourceService);
  documentInfoService = inject(DocumentInfoService);
  userService = inject(UserService);
  private cdr = inject(ChangeDetectorRef);
  private translate = inject(TranslateService);
  private appTranslation = inject(AppTranslationService);

  private dialog = inject(MatDialog);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  store = inject(Store);
  private destroyRef = inject(DestroyRef);
  private libraryContext = inject(LibraryContextService);
  private configService = inject(ConfigService);
  recordHandler = inject(RecordHandlerService);
  private availableYears = toSignal(this.store.select(selectAvailableYears));

  runtimeLicenses = computed(() => this.documentInfoService.getRuntimeLicenses());

  // Runtime licenses that the licenses config has flagged with a `providedBy` entry —
  // these are the ones rendered in the "provided under license" metadata section.
  providedByLicenses = computed(() => {
    return this.runtimeLicenses().filter(id => this.configService.getLicenseConfig(id)?.providedBy?.display === true);
  });

  // CDK aggregator: sources (collections) for this document and the selected one.
  cdkCollections = signal<string[]>([]);
  selectedCdkCollection = signal<string>('');
  isCdk = () => this.configService.isCdk();

  constructor() {
    // Single source of truth: whenever the selected collection changes, push it
    // into CdkSourceService so every reader API call (IIIF tiles, images, ALTO,
    // PDF, audio, page-info, thumbnails) gets prefixed with the right member
    // library. One wiring point. In collections mode the host page owns the source
    // selection (it re-scopes the child document grid), so we don't touch it here.
    effect(() => {
      if (this.collectionsMode) return;
      const selected = this.selectedCdkCollection();
      this.cdkSource.setCode(this.isCdk() ? (selected || null) : null);
    });
  }

  @Input() uuid: string = '';

  @Input() metadata: Metadata | null = null;

  // Collections mode: the CDK source selector is sourced from the `metadata` input
  // (the collection's own cdk.collection / cdk.leader) and changes are emitted to the
  // parent instead of triggering detail-page side effects (IIIF viewer, page reload,
  // MODS refetch). The collections page uses the selection to re-scope its child grid.
  @Input() collectionsMode: boolean = false;

  @Output() cdkCollectionChange = new EventEmitter<string>();

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
    // Get Solr data from store to supplement with model, accessibility, and license
    const solrData = await firstValueFrom(this.store.select(selectDocumentDetail).pipe(take(1)));
    if (solrData) {
      this._solrData.set(solrData);
    }

    // Seed the source selector. On CDK the URL (`?source=`) wins, then cdk.leader,
    // then first available. Off-CDK, ensure any stray `source` param is stripped
    // so the URL doesn't leak across instances.
    if (this.isCdk()) {
      // In collections mode the cdk fields come from the collection's own metadata
      // (the `metadata` input), not the document-detail store.
      const cdkSource = this.collectionsMode ? this.metadata : solrData;
      const collections = cdkSource?.cdkCollections ?? [];
      const urlSource = this.route.snapshot.queryParamMap.get('source');
      this.cdkCollections.set(collections);
      this.selectedCdkCollection.set(
        pickCdkCollection(urlSource, cdkSource?.cdkLeader, collections) ?? ''
      );
    } else {
      this.cdkCollections.set([]);
      this.selectedCdkCollection.set('');
      this.stripSourceParamIfPresent();
    }

    const baseMods = await this.buildMergedMetadata(this.selectedCdkCollection() || undefined);
    this._data.set(baseMods);
    this.cdr.markForCheck();
    this.loadCollectionNames();
    this.loadRootUnitCount();
  }

  // For a unit of a multivolume monograph, fetch the root document so the badge can
  // show the parent's unit count ("Knihy (n)"). The count lives only on the root.
  private async loadRootUnitCount(): Promise<void> {
    this._rootUnitCount.set(0);
    if (!this.isMonographUnitDoc()) return;
    const rootPid = this._solrData()?.rootPid;
    if (!rootPid) return;
    try {
      const root = await firstValueFrom(this.solrService.getDetailItem(rootPid));
      const count = root?.['count_monograph_unit'];
      this._rootUnitCount.set(count ? parseInt(count, 10) : 0);
      this.cdr.markForCheck();
    } catch (e) {
      console.warn('MetadataSection: failed to load root unit count for', rootPid, e);
    }
  }

  /**
   * Fetches MODS (plus root MODS when applicable) for the given member library,
   * merges in the component's `metadata` input, then fills every remaining gap
   * from the Solr document. Solr is authoritative for model/access/licence/issue
   * fields; MODS wins everywhere else.
   */
  private async buildMergedMetadata(libraryCode: string | undefined): Promise<any> {
    const modsData = await this.modsParser.getMods(this.uuid, 'full', libraryCode);
    const solrData = this._solrData();

    let baseMods: any = { ...modsData };

    // If the document has a root.pid different from its own pid (e.g. periodicalvolume,
    // periodicalitem), show the root's MODS as primary and the child's own MODS in a subsection.
    const rootPid = solrData?.rootPid;
    if (rootPid && rootPid !== this.uuid) {
      try {
        const rootMods = await this.modsParser.getMods(rootPid, 'full', libraryCode);
        if (rootMods) {
          const child = modsData as any;
          const hasChildData = child && (
            child.dateStr ||
            child.authors?.length > 0 ||
            child.languages?.length > 0 ||
            child.locations?.length > 0 ||
            child.notes?.length > 0
          );
          this._childData.set(hasChildData ? child : null);
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

    // Merge the full Solr document: MODS wins where present, Solr fills every gap.
    if (solrData && solrData.uuid === this.uuid) {
      this.mergeMissing(baseMods, solrData);
      // Solr-authoritative fields always override whatever MODS carries.
      baseMods.model = solrData.model;
      baseMods.isPublic = solrData.isPublic;
      baseMods.licence = solrData.licence;
      baseMods.licences = solrData.licences;
      baseMods.ownParentPid = solrData.ownParentPid;
      baseMods.issueNumber = solrData.issueNumber;
      baseMods.issueDate = solrData.issueDate;
    }

    // The unit count is Solr-derived and the MODS default (0) blocks `mergeMissing`,
    // so force it from whichever source actually carries it (store doc or input).
    const unitCount = (solrData?.uuid === this.uuid ? solrData?.monographUnitCount : undefined)
      ?? this.metadata?.monographUnitCount
      ?? 0;
    baseMods.monographUnitCount = unitCount;

    return baseMods;
  }

  private stripSourceParamIfPresent(): void {
    if (!this.route.snapshot.queryParamMap.has('source')) return;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { source: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
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

  async onCdkCollectionChange(collection: string) {
    if (!collection || collection === this.selectedCdkCollection()) return;
    this.selectedCdkCollection.set(collection);

    // Collections mode: the host page owns the source-driven behaviour (URL persistence
    // and re-scoping the child document grid). Just emit the new selection and stop —
    // none of the detail-page side effects below apply.
    if (this.collectionsMode) {
      this.cdkCollectionChange.emit(collection);
      return;
    }

    // Persist the selection in the URL so the view is linkable. The `effect()` in
    // the constructor propagates the new selection into CdkSourceService.
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { source: collection },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
    // Pages come from a per-library Solr index — refetch scoped to the new collection
    // so the sidebar grid and viewer navigation reflect the selected source.
    this.store.dispatch(reloadPagesForCdkCollection({ uuid: this.uuid, cdkCollection: collection }));
    // Re-fetch MODS from the newly-selected member library; solr data and the detected
    // CDK collection list stay as they are — only the MODS source changes.
    const baseMods = await this.buildMergedMetadata(collection);
    this._data.set(baseMods);
    this.cdr.markForCheck();
    this.loadCollectionNames();
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

  getVolumeItems(): string[] {
    const d = this.data;
    if (!d?.ownParentPid) return [];
    const years = this.availableYears();
    const vol: any = years?.find((y: any) => y.pid === d.ownParentPid);
    if (!vol) return [];
    const items: string[] = [];
    const year = vol['date.str'] ?? vol.year;
    const number = vol['part.number.str'];
    if (year) items.push(`${this.translate.instant('publication-year')} ${year}`);
    if (number) items.push(`${this.translate.instant('volume')} ${number}`);
    return items;
  }

  getIssueItems(): string[] {
    const d = this.data;
    const items: string[] = [];
    if (d?.issueDate) items.push(`${this.translate.instant('publication-date')} ${d.issueDate}`);
    if (d?.issueNumber) items.push(`${this.translate.instant('issue')} ${d.issueNumber}`);
    return items;
  }

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

  get solrData(): Metadata | null { return this._solrData(); }

  // True when the current document is a unit of a multivolume monograph.
  isMonographUnitDoc(): boolean {
    const sd = this._solrData();
    const model = sd?.model || this.data?.model;
    const rootModel = sd?.rootModel;
    return model === DocumentTypeEnum.monographunit && rootModel === DocumentTypeEnum.monograph;
  }

  // Navigate from a monograph unit back to its root multivolume monograph page.
  goToMonograph(): void {
    if (!this.isMonographUnitDoc()) return;
    const rootPid = this._solrData()?.rootPid;
    if (rootPid) {
      this.recordHandler.navigateToMonograph(rootPid);
    }
  }

  // Model shown in the document-type badge. For a unit of a multivolume monograph we
  // show the root monograph ("Knihy (n)") rather than the unit itself ("Díl").
  get badgeModel(): string {
    if (this.isMonographUnitDoc()) {
      return this._solrData()?.rootModel || this.data?.model || '';
    }
    return this.data?.model || '';
  }

  // Unit count passed to the badge so a multivolume root renders as "Knihy (n)".
  get badgeUnitCount(): number {
    if (this.isMonographUnitDoc()) {
      return this._rootUnitCount();
    }
    return this.data?.monographUnitCount || 0;
  }

  // True when this document is a child of a periodical hierarchy (volume/issue/supplement)
  // and clicking the title should navigate up to the periodical (volumes screen).
  isPeriodicalChild(): boolean {
    const sd = this._solrData();
    const rootModel = sd?.rootModel;
    const currentModel = sd?.model || this.data?.model;
    return rootModel === DocumentTypeEnum.periodical && currentModel !== DocumentTypeEnum.periodical;
  }

  clickedTitle(): void {
    if (!this.isPeriodicalChild()) return;
    const rootPid = this._solrData()?.rootPid;
    if (rootPid) {
      this.recordHandler.navigateToPeriodical(rootPid);
    }
  }

  getIssn(): string | null {
    if (!this.data?.identifiers) {
      return null;
    }
    const issn = this.data.identifiers['issn'] ||
      this.data.identifiers['ISSN'] ||
      this.data.identifiers['id_issn'];
    if (issn) {
      return Array.isArray(issn) ? issn.join(', ') : String(issn);
    }
    return null;
  }

  // Identifier keys that are internal/operational (used pre-digitization) and
  // should not be shown in the user-facing identifier list.
  private readonly internalIdentifierKeys = new Set(
    ['uuid', 'iduuid', 'id_uuid', 'barcode'].map(k => k.toLowerCase())
  );

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

  hasNonIsbnIdentifiers(): boolean {
    const ids = this.getIdentifiersWithoutIsbn();
    if (!ids) return false;
    return Object.keys(ids).some(k => {
      const v = ids[k];
      return v !== null && v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0);
    });
  }

  getIdentifiersWithoutIsbn(): { [key: string]: any } | undefined {
    if (!this.data?.identifiers) {
      return undefined;
    }
    const filtered: { [key: string]: any } = {};
    const excluded = new Set([
      'isbn', 'ISBN', 'id_isbn',
      'issn', 'ISSN', 'id_issn',
    ]);
    for (const key of Object.keys(this.data.identifiers)) {
      if (excluded.has(key)) continue;
      if (this.internalIdentifierKeys.has(key.toLowerCase())) continue;
      filtered[key] = this.data.identifiers[key];
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
      width: '40%',
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

  getProvidedByLicenseImage(license: string): string | null {
    return this.configService.getLicenseConfig(license)?.providedBy?.imageUrl ?? null;
  }

  getProvidedByLicenseUrl(license: string): string | null {
    return this.configService.getLicenseConfig(license)?.providedBy?.url ?? null;
  }

  getDonatorImage(donator: string): string | null {
    return `/img/logo/donator/${donator.toLowerCase()}.png`;
  }

  getDonatorUrl(donator: string): string | null {
    return this.donatorUrlMap[donator.toLowerCase()] ?? null;
  }

}
