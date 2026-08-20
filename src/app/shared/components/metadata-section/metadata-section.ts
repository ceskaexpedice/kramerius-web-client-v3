import { Component, inject, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, computed, ChangeDetectorRef, signal, DestroyRef, effect } from '@angular/core';
import { NgForOf, NgIf, NgTemplateOutlet } from '@angular/common';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Author, Metadata, Publisher, PhysicalDescription, NoteInfo, Location, InCollections } from '../../models/metadata.model';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { APP_ROUTES_ENUM } from '../../../app.routes';
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
import { LicenseInfoDialogComponent } from '../../dialogs/license-info-dialog/license-info-dialog.component';
import { SelectComponent } from '../select/select.component';
import { SafeHtmlPipe } from '../../pipes/safe-html.pipe';
import { ConfigService } from '../../../core/config/config.service';
import { pickCdkCollection } from '../../utils/cdk-collection';
import { ALL_SOURCES } from '../../utils/cdk-source.constants';
import { RecordHandlerService } from '../../services/record-handler.service';
import { DocumentTypeEnum } from '../../../modules/constants/document-type';
import { CdkTooltipDirective } from '../../directives';
import { AppTranslationService } from '../../translation/app-translation.service';
import { SettingsService } from '../../../modules/settings/settings.service';
import { getLanguageFallbackChain } from '../../translation/translation-fallback-chain';
import { SOLR_LANG_TO_APP_LANG, resolveLocalizedValue } from '../../utils/language-utils';

@Component({
  selector: 'app-metadata-section',
  imports: [
    NgForOf,
    NgIf,
    NgTemplateOutlet,
    TranslatePipe,
    MetadataSectionItem,
    CollapsibleContent,
    AccessibilityBadgeComponent,
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

  /** Alternative titles start hidden; the "more" toggle under the title reveals them. */
  alternativeTitlesExpanded = signal(false);

  toggleAlternativeTitles() {
    this.alternativeTitlesExpanded.update(v => !v);
  }

  /**
   * Alternative titles (MODS `titleInfo type="alternative"`), revealed under the
   * main title by the "more" toggle. Subtitle and part designations are appended
   * so a variant reads in full, and anything identical to the displayed main
   * title is dropped to avoid repeating the heading.
   */
  get alternativeTitles(): string[] {
    const titles = this.data?.titles ?? [];
    const main = this.localizedMainTitle.trim();
    const seen = new Set<string>();
    const result: string[] = [];

    for (const t of titles) {
      if (t.type !== 'alternative') continue;

      let text = t.mainTitle().trim();
      if (t.subTitle) text += `: ${t.subTitle}`;
      if (t.partNumber) text += `. ${t.partNumber}`;
      if (t.partName) text += `. ${t.partName}`;
      text = text.trim();

      if (!text || text === main || seen.has(text)) continue;
      seen.add(text);
      result.push(text);
    }
    return result;
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
  private settingsService = inject(SettingsService);
  recordHandler = inject(RecordHandlerService);
  private availableYears = toSignal(this.store.select(selectAvailableYears));

  runtimeLicenses = computed(() => this.documentInfoService.getRuntimeLicenses());

  // Runtime licenses rendered in the "provided under license" metadata section.
  // A license is shown if it's open (public-domain) or flagged with `providedBy.display`
  // in config. Every open license is collapsed to the generic `public` label so e.g.
  // `knav_public_contract` still reads as "provided under license: public".
  providedByLicenses = computed(() => {
    const openLicenses = new Set(this.configService.getOpenLicenses());
    const shown = this.runtimeLicenses()
      .filter(id => openLicenses.has(id) || this.configService.getLicenseConfig(id)?.providedBy?.display === true)
      .map(id => (openLicenses.has(id) ? 'public' : id));
    return [...new Set(shown)];
  });

  // CDK aggregator: sources (collections) for this document and the selected one.
  cdkCollections = signal<string[]>([]);
  selectedCdkCollection = signal<string>('');
  isCdk = () => this.configService.isCdk();

  // Options shown in the source <app-select>: the member libraries, optionally
  // prefixed with the ALL_SOURCES sentinel when includeAllOption is set.
  cdkSourceOptions = computed<string[]>(() =>
    this.includeAllOption ? [ALL_SOURCES, ...this.cdkCollections()] : this.cdkCollections()
  );

  // Label resolver for the source dropdown: the ALL_SOURCES sentinel renders as the
  // translated "All sources" label; every real collection code renders as-is.
  cdkSourceLabel = (code: string | null): string =>
    code === ALL_SOURCES ? this.translate.instant('cdk.all-sources') : (code ?? '');

  // Logo URL for a CDK source option. The collection code is the member library's
  // shortcut, which the central registry serves a logo for at this path. The
  // ALL_SOURCES sentinel has no library, so it gets no logo.
  cdkSourceLogo = (code: string | null): string | null =>
    code && code !== ALL_SOURCES
      ? `https://registr.digitalniknihovna.cz/libraries/${code}/logo`
      : null;

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

  // When true (periodical page), the source dropdown gains a leading "All sources"
  // entry (ALL_SOURCES sentinel) meaning no cdk.collection filter, and defaults to it
  // unless ?source= already names a concrete collection. Off by default so the
  // detail/collections selectors are unchanged.
  @Input() includeAllOption: boolean = false;

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
      if (this.includeAllOption) {
        // "All sources" is the deliberate default here; only a concrete ?source=
        // already present in the URL overrides it (linkable state wins). We do NOT
        // apply the leader-preference of pickCdkCollection in this mode.
        this.selectedCdkCollection.set(
          urlSource && collections.includes(urlSource) ? urlSource : ALL_SOURCES
        );
      } else {
        this.selectedCdkCollection.set(
          pickCdkCollection(
            urlSource,
            cdkSource?.cdkLeader,
            collections,
            cdkSource?.cdkLicenses ?? [],
            this.userService.licenses,
          ) ?? ''
        );
      }
    } else {
      this.cdkCollections.set([]);
      this.selectedCdkCollection.set('');
      this.stripSourceParamIfPresent();
    }

    const baseMods = await this.buildMergedMetadata(this.effectiveLibraryCode());
    this._data.set(baseMods);
    this.cdr.markForCheck();
    this.loadCollectionNames();
    this.loadRootUnitCount();
  }

  /**
   * The member-library code to fetch MODS for: the selected collection, or undefined
   * when nothing is selected or "All sources" is active (leader/default MODS).
   */
  private effectiveLibraryCode(): string | undefined {
    const selected = this.selectedCdkCollection();
    if (!selected || selected === ALL_SOURCES) return undefined;
    return selected;
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
      // For a periodical volume the primary `data` is the root periodical's MODS, so the
      // volume fields must be carried over from the volume's own Solr doc, or the Volume
      // section can't render them.
      baseMods.volumeNumber = solrData.volumeNumber;
      baseMods.volumeYear = solrData.volumeYear;
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

  // Bulleted items for the "Ročník" section. The publication-year item is `clickable`
  // and navigates to the parent volume's detail view; the volume number is plain text.
  //
  // A `computed` (not a plain method) is essential here: the template's *ngFor renders
  // these objects, so returning fresh references on every change-detection pass would
  // make Angular tear down and rebuild the <li>/<a> between a real click's mousedown and
  // mouseup, swallowing the click. `computed` keeps a stable reference until its inputs
  // change, so the DOM node survives the click.
  readonly volumeItems = computed<{ label: string; value: string; clickable?: boolean }[]>(() => {
    const d = this._data();
    if (!d) return [];

    const items: { label: string; value: string; clickable?: boolean }[] = [];

    // When the opened document is itself the volume (periodical volume page), describe
    // it directly from its own parsed volume fields — no parent lookup needed.
    if (d.volumeYear || d.volumeNumber) {
      if (d.volumeYear) items.push({ label: this.translate.instant('publication-year'), value: String(d.volumeYear) });
      if (d.volumeNumber) items.push({ label: this.translate.instant('volume'), value: String(d.volumeNumber) });
      return items;
    }

    // Otherwise (a child document, e.g. an issue) look up the parent volume so the
    // publication-year item can link up to it.
    if (!d.ownParentPid) return [];
    const vol: any = this.availableYears()?.find((y: any) => y.pid === d.ownParentPid);
    if (!vol) return [];
    const year = vol['date.str'] ?? vol.year;
    const number = vol['part.number.str'];
    if (year) items.push({ label: this.translate.instant('publication-year'), value: String(year), clickable: true });
    if (number) items.push({ label: this.translate.instant('volume'), value: String(number) });
    return items;
  });

  clickedVolumeYear(): void {
    // ownParentPid points at the periodical volume, which opens under the
    // periodical (year/volume) view rather than the plain detail view.
    const parentPid = this.data?.ownParentPid;
    if (parentPid) {
      this.recordHandler.navigateToPeriodical(parentPid);
    }
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
  // should not be shown in the user-facing identifier list. `other` / `sici` are
  // cataloguing leftovers that are especially noisy on periodicals.
  private readonly internalIdentifierKeys = new Set(
    [
      'uuid', 'iduuid', 'id_uuid', 'barcode',
      'other', 'idother', 'id_other',
      'sici', 'idsici', 'id_sici',
    ].map(k => k.toLowerCase())
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

  /**
   * ISMN (music publications). Promoted next to ISBN/ISSN instead of being
   * buried in the generic identifier list.
   */
  getIsmn(): string | null {
    if (!this.data?.identifiers) {
      return null;
    }
    const ismn = this.data.identifiers['ismn'] ||
      this.data.identifiers['ISMN'] ||
      this.data.identifiers['id_ismn'];

    if (ismn) {
      return Array.isArray(ismn) ? ismn.join(', ') : String(ismn);
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
      'ismn', 'ISMN', 'id_ismn',
    ]);
    for (const key of Object.keys(this.data.identifiers)) {
      if (excluded.has(key)) continue;
      if (this.internalIdentifierKeys.has(key.toLowerCase())) continue;
      filtered[key] = this.data.identifiers[key];
    }
    return Object.keys(filtered).length > 0 ? filtered : undefined;
  }

  // Href builders — parallel to the click handlers below. These produce real
  // navigable URLs so every clickable metadata item renders as an <a href> and
  // can be opened in a new tab (Ctrl/Cmd/middle-click). A plain left-click is
  // still intercepted and handled in-app by the matching `clicked*` handler.

  /** Serialize a router segment array (already library-prefixed) into an href string. */
  private routeHref(segments: any[]): string {
    return this.router.serializeUrl(this.router.createUrlTree(segments));
  }

  /** Href for a search-results filter URL (same query string the handlers navigate to). */
  private searchHref(url: string): string {
    return this.searchService.getRedirectUrl(url);
  }

  authorHref = (author: Author): string => {
    const filterName = author.nameForFilter || author.name;
    return this.searchHref(`?fq=${facetKeysEnum.authors}:${filterName}&${facetKeysEnum.authors}_operator=OR`);
  };

  subjectNamePersonalHref = (subject: Author): string => {
    const filterName = subject.nameForFilter || subject.name;
    return this.searchHref(`?fq=${facetKeysEnum.subjectNamesPersonal}:${encodeURIComponent(filterName)}&${facetKeysEnum.subjectNamesPersonal}_operator=OR`);
  };

  subjectNameCorporateHref = (subject: Author): string => {
    const filterName = subject.nameForFilter || subject.name;
    return this.searchHref(`?fq=${facetKeysEnum.subjectNamesCorporate}:${encodeURIComponent(filterName)}&${facetKeysEnum.subjectNamesCorporate}_operator=OR`);
  };

  subjectTemporalHref = (subjectTemporal: string): string =>
    this.searchHref(`?fq=${facetKeysEnum.subjectTemporals}:${encodeURIComponent(subjectTemporal)}&${facetKeysEnum.subjectTemporals}_operator=OR`);

  languageHref = (language: string): string =>
    this.searchHref(`?fq=${facetKeysEnum.languages}:${encodeURIComponent(language)}&${facetKeysEnum.languages}_operator=OR`);

  locationHref = (location: Location): string =>
    this.searchHref(`?fq=${facetKeysEnum.physical_locations}:${encodeURIComponent(location.physicalLocation)}&${facetKeysEnum.physical_locations}_operator=OR`);

  keywordHref = (keyword: string): string =>
    this.searchHref(`?fq=${facetKeysEnum.keywords}:${encodeURIComponent(keyword)}&${facetKeysEnum.keywords}_operator=OR`);

  genreHref = (genre: string): string =>
    this.searchHref(`?fq=${facetKeysEnum.genres}:${encodeURIComponent(genre)}&${facetKeysEnum.genres}_operator=OR`);

  geoNameHref = (geoName: string): string =>
    this.searchHref(`?fq=${facetKeysEnum.geographic_names}:${encodeURIComponent(geoName)}&${facetKeysEnum.geographic_names}_operator=OR`);

  collectionHref = (collection: InCollections): string =>
    this.routeHref(this.libraryContext.prependLibraryPrefix(['/collection', collection.uuid]));

  documentTypeHref = (model: string): string =>
    this.searchHref(`?fq=model:${encodeURIComponent(model)}`);

  accessibilityHref = (accessibility: string): string =>
    this.searchHref(`?fq=${facetKeysEnum.accessibility}:${encodeURIComponent(accessibility)}`);

  /** Href for the clickable publication-year (parent periodical volume). */
  volumeYearHref(): string | null {
    const parentPid = this.data?.ownParentPid;
    if (!parentPid) return null;
    return this.routeHref(this.libraryContext.prependLibraryPrefix([APP_ROUTES_ENUM.PERIODICAL_VIEW, parentPid]));
  }

  /** Href for the title / "go to periodical" link (root periodical). */
  periodicalHref(): string | null {
    if (!this.isPeriodicalChild()) return null;
    const rootPid = this._solrData()?.rootPid;
    if (!rootPid) return null;
    return this.routeHref(this.libraryContext.prependLibraryPrefix([APP_ROUTES_ENUM.PERIODICAL_VIEW, rootPid]));
  }

  /** Href for the "go to monograph" link (root multivolume monograph). */
  monographHref(): string | null {
    if (!this.isMonographUnitDoc()) return null;
    const rootPid = this._solrData()?.rootPid;
    if (!rootPid) return null;
    return this.routeHref(this.libraryContext.prependLibraryPrefix([APP_ROUTES_ENUM.MONOGRAPH_VIEW, rootPid]));
  }

  /**
   * Intercept a left-click on a link that navigates in-app: run the SPA handler
   * and prevent the default full navigation. Modifier / middle clicks fall
   * through so the browser opens the href in a new tab/window as usual.
   */
  handleLinkNav(event: MouseEvent, run: () => void): void {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) {
      return;
    }
    event.preventDefault();
    run();
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

  /** Message page key used for the license description shown in the info dialog. */
  private static readonly LICENSE_INFO_PAGE_KEY = 'unauthenticated';

  /**
   * True for a license that has a description HTML page configured
   * (e.g. public -> local-config/html/licenses/public.cs.html), so its
   * name can be rendered as a clickable link opening the info dialog.
   */
  hasLicenseInfo(license: string): boolean {
    const lang = this.appTranslation.currentLanguage().code;
    return !!this.configService.getMessagePageUrl(license, MetadataSection.LICENSE_INFO_PAGE_KEY, lang);
  }

  /**
   * Opens a dialog with the license description, loaded from the license's
   * "unauthenticated" message page HTML defined in config-licenses.json
   * (e.g. public -> local-config/html/licenses/public.cs.html), in the
   * currently active language.
   */
  async openLicenseInfo(license: string, event: Event): Promise<void> {
    event.preventDefault();
    event.stopPropagation();

    const lang = this.appTranslation.currentLanguage().code;
    const url = this.configService.getMessagePageUrl(license, MetadataSection.LICENSE_INFO_PAGE_KEY, lang);
    if (!url) return;

    const content = await this.configService.loadHtmlContent(url);
    const title = this.configService.getLocalizedLabel('license', license, lang);

    this.dialog.open(LicenseInfoDialogComponent, {
      data: { title, content },
      autoFocus: false,
      restoreFocus: false,
      panelClass: 'simple-dialog-panel'
    });
  }

  getProvidedByLicenseImage(license: string): string | null {
    return this.configService.getLicenseConfig(license)?.providedBy?.imageUrl ?? null;
  }

  getProvidedByLicenseUrl(license: string): string | null {
    return this.configService.getLicenseConfig(license)?.providedBy?.url ?? null;
  }

  /**
   * Efektivni tema (uz ma vyreseny i rezim "system"), pouzita pro vyber
   * dark varianty loga donatora.
   */
  private effectiveTheme = toSignal(this.settingsService.effectiveTheme$, { initialValue: 'light' as const });

  /**
   * Logo donatora. V tmave teme se nejdriv zkusi varianta `<donator>-dark.png`;
   * dark verzi ale nemaji vsichni donatori, takze kdyz se obrazek nenacte,
   * `onDonatorImageError` prepne src zpet na normalni logo.
   */
  getDonatorImage(donator: string): string | null {
    const base = `/img/logo/donator/${donator.toLowerCase()}`;
    return this.effectiveTheme() === 'dark' ? `${base}-dark.png` : `${base}.png`;
  }

  /**
   * Fallback pro donatory bez dark varianty: pri 404 na `-dark.png` se nacte
   * normalni logo. Hlida se, aby se pri chybejicim normalnim logu necyklilo.
   */
  onDonatorImageError(event: Event, donator: string): void {
    const img = event.target as HTMLImageElement;
    const fallback = `/img/logo/donator/${donator.toLowerCase()}.png`;
    if (img.getAttribute('src') === fallback) {
      img.style.display = 'none';
      return;
    }
    img.src = fallback;
  }

  getDonatorUrl(donator: string): string | null {
    return this.donatorUrlMap[donator.toLowerCase()] ?? null;
  }

}
