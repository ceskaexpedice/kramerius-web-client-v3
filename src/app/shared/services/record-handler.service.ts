import { inject, Injectable } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DocumentTypeEnum } from '../../modules/constants/document-type';
import { APP_ROUTES_ENUM } from '../../app.routes';
import { SearchDocument } from '../../modules/models/search-document';
import { SearchService } from './search.service';
import { MatDialog } from '@angular/material/dialog';
import { CitationDialogComponent } from '../dialogs/citation-dialog/citation-dialog.component';
import { ShareDialogComponent } from '../dialogs/share-dialog/share-dialog.component';
import { Metadata } from '../models/metadata.model';
import { PUBLIC_LICENSES } from '../../core/solr/solr-misc';
import { customDefinedFacetsEnum, facetKeysEnum } from '../../modules/search-results-page/const/facets';
import { AdminSelectionService } from './admin-selection.service';
import { RecordItem, searchDocumentToRecordItem } from '../components/record-item/record-item.model';
import { PeriodicalItemChild, PeriodicalItemYear } from '../../modules/models/periodical-item';
import { BreakpointService } from './breakpoint.service';

@Injectable({
  providedIn: 'root'
})
export class RecordHandlerService {

  private dialog = inject(MatDialog);
  private route = inject(ActivatedRoute);
  private adminSelectionService = inject(AdminSelectionService);
  private breakpointService = inject(BreakpointService);

  // Filter keys that should be preserved when navigating to periodicals
  private readonly FILTERS_TO_PRESERVE = ['yearFrom', 'yearTo', 'dateFrom', 'dateTo', 'dateOffset', customDefinedFacetsEnum.accessibility, facetKeysEnum.license];

  constructor(
    private router: Router,
    private searchService: SearchService
  ) { }

  /**
   * Handle navigation based on the document type.
   */
  handleDocumentClick(document: SearchDocument): void {
    const model = document.model;

    this.searchService.backupCurrentSearchUrl();

    switch (model) {
      case DocumentTypeEnum.periodical:
        //this.navigateToPeriodical(document.pid);
        break;
      case DocumentTypeEnum.soundrecording:
        this.navigateToMusic(document.pid);
        break;
      default:
        this.navigateToDetail(document.pid);
    }
  }

  handleDocumentClickByModelAndPid(model: string, pid: string): void {
    switch (model) {
      case DocumentTypeEnum.periodical:
        //this.navigateToPeriodical(pid);
        break;
      case DocumentTypeEnum.soundrecording:
        this.navigateToMusic(pid);
        break;
      default:
        this.navigateToDetail(pid);
    }
  }

  getHandleDocumentUrlByModelAndPid(model: string, pid: string, rootPid: string | null = null): string {
    switch (model) {
      case DocumentTypeEnum.periodical:
        return this.router.createUrlTree([APP_ROUTES_ENUM.PERIODICAL_VIEW, pid]).toString();
      case DocumentTypeEnum.periodicalvolume:
        return this.router.createUrlTree([APP_ROUTES_ENUM.PERIODICAL_VIEW, pid]).toString();
      case DocumentTypeEnum.soundrecording:
        return this.router.createUrlTree([APP_ROUTES_ENUM.MUSIC_VIEW, pid]).toString();
      case DocumentTypeEnum.collection:
        return this.router.createUrlTree([APP_ROUTES_ENUM.COLLECTION, pid]).toString();
      case DocumentTypeEnum.convolute:
        return this.router.createUrlTree([APP_ROUTES_ENUM.MONOGRAPH_VIEW, pid]).toString();
      case DocumentTypeEnum.article:
        // DETAIL_VIEW/rootPid?page=pid&fulltext=xx
        if (rootPid) {
          const fulltext = this.searchService.submittedTerm;
          const queryParams: any = {
            article: pid
          }
          if (fulltext && fulltext.trim().length > 0) {
            queryParams['fulltext'] = fulltext;
          }
          return this.router.createUrlTree([APP_ROUTES_ENUM.DETAIL_VIEW, rootPid], { queryParams }).toString();
        } else {
          return this.router.createUrlTree([APP_ROUTES_ENUM.DETAIL_VIEW, pid]).toString();
        }
      case DocumentTypeEnum.page:
        // DETAIL_VIEW/rootPid?page=pid&fulltext=xx
        if (rootPid) {
          const fulltext = this.searchService.submittedTerm;
          const queryParams: any = {
            page: pid
          }
          if (fulltext && fulltext.trim().length > 0) {
            queryParams['fulltext'] = fulltext;
          }
          return this.router.createUrlTree([APP_ROUTES_ENUM.DETAIL_VIEW, rootPid], { queryParams }).toString();
        } else {
          return this.router.createUrlTree([APP_ROUTES_ENUM.DETAIL_VIEW, pid]).toString();
        }
      default:
        return this.router.createUrlTree([APP_ROUTES_ENUM.DETAIL_VIEW, pid]).toString();
    }
  }

  /**
   * Navigate to the document detail view.
   */
  public navigateToDetail(pid: string): void {
    this.router.navigate([APP_ROUTES_ENUM.DETAIL_VIEW, pid]);
  }

  /**
   * Navigate to the year selection page for a periodical.
   */
  public navigateToPeriodical(pid: string): void {
    this.router.navigate([APP_ROUTES_ENUM.PERIODICAL_VIEW, pid]);
  }

  public navigateToMusic(pid: string): void {
    this.router.navigate([APP_ROUTES_ENUM.MUSIC_VIEW, pid]);
  }

  public navigateToEmptySearch(): void {
    this.searchService.searchTerm.set('');
    this.router.navigate([APP_ROUTES_ENUM.SEARCH], { queryParams: {}, queryParamsHandling: null });
  }

  navigateFromPeriodicalToSearchResults(): void {
    const returnUrl = this.searchService.getBackupSearchUrl();
    if (returnUrl) {
      this.router.navigateByUrl(returnUrl);
    } else {
      this.router.navigate([APP_ROUTES_ENUM.SEARCH_RESULTS]);
    }
  }

  openCitationDialog(document: Metadata | null) {
    if (!document) {
      console.warn('No document provided for citation dialog.');
      return;
    }
    const isMobileOrTablet = this.breakpointService.isMobile() || this.breakpointService.isTablet();
    this.dialog.open(CitationDialogComponent, {
      width: isMobileOrTablet ? '100vw' : '60vw',
      data: { document },
    });
  }

  openShareDialog(document: Metadata | null, queryParams?: { [key: string]: string }) {
    if (!document) {
      console.warn('No document provided for share dialog.');
      return;
    }
    const isMobileOrTablet = this.breakpointService.isMobile() || this.breakpointService.isTablet();
    this.dialog.open(ShareDialogComponent, {
      width: isMobileOrTablet ? '100vw' : '60vw',
      data: { document, queryParams },
    })
  }

  /**
   * Return whether the given model is considered periodical.
   */
  isPeriodical(model: string): boolean {
    return model === DocumentTypeEnum.periodical;
  }

  isParentPeriodical(model: string): boolean {
    return model === DocumentTypeEnum.periodical || model === DocumentTypeEnum.periodicalvolume || model === DocumentTypeEnum.periodicalitem;
  }

  clickedToolbarTitle(model: string, pid: string) {
    console.log('clickedToolbarTitle::', model, pid);
    if (this.isParentPeriodical(model)) {
      this.navigateToPeriodical(pid);
    }
  }

  public getDocumentHierarchyLevels(document: Metadata): any[] {
    const hierarchyLevels: DocumentTypeEnum[] = [];

    // Determine hierarchy based on document type
    switch (document.model as DocumentTypeEnum) {
      case DocumentTypeEnum.periodical:
        hierarchyLevels.push(DocumentTypeEnum.periodical, DocumentTypeEnum.periodicalvolume, DocumentTypeEnum.periodicalitem, DocumentTypeEnum.page);
        break;

      case DocumentTypeEnum.periodicalvolume:
        hierarchyLevels.push(DocumentTypeEnum.periodical, DocumentTypeEnum.periodicalvolume, DocumentTypeEnum.periodicalitem, DocumentTypeEnum.page);
        break;

      case DocumentTypeEnum.periodicalitem:
        hierarchyLevels.push(DocumentTypeEnum.periodical, DocumentTypeEnum.periodicalvolume, DocumentTypeEnum.periodicalitem, DocumentTypeEnum.page);
        break;

      case DocumentTypeEnum.monograph:
        hierarchyLevels.push(DocumentTypeEnum.monograph, DocumentTypeEnum.page);
        break;

      case DocumentTypeEnum.graphic:
        hierarchyLevels.push(DocumentTypeEnum.graphic, DocumentTypeEnum.page);
        break;

      case DocumentTypeEnum.map:
        hierarchyLevels.push(DocumentTypeEnum.map, DocumentTypeEnum.page);
        break;

      case DocumentTypeEnum.sheetmusic:
        hierarchyLevels.push(DocumentTypeEnum.sheetmusic, DocumentTypeEnum.page);
        break;

      case DocumentTypeEnum.manuscript:
        hierarchyLevels.push(DocumentTypeEnum.manuscript, DocumentTypeEnum.page);
        break;

      case DocumentTypeEnum.archive:
        hierarchyLevels.push(DocumentTypeEnum.archive, DocumentTypeEnum.page);
        break;

      case DocumentTypeEnum.collection:
        hierarchyLevels.push(DocumentTypeEnum.collection, DocumentTypeEnum.page);
        break;

      case DocumentTypeEnum.convolute:
        hierarchyLevels.push(DocumentTypeEnum.convolute, DocumentTypeEnum.page);
        break;

      case DocumentTypeEnum.supplement:
        hierarchyLevels.push(DocumentTypeEnum.supplement, DocumentTypeEnum.page);
        break;

      case DocumentTypeEnum.article:
        hierarchyLevels.push(DocumentTypeEnum.article);
        break;

      case DocumentTypeEnum.soundrecording:
        hierarchyLevels.push(DocumentTypeEnum.soundrecording, DocumentTypeEnum.soundunit, DocumentTypeEnum.track);
        break;

      case DocumentTypeEnum.soundunit:
        hierarchyLevels.push(DocumentTypeEnum.soundrecording, DocumentTypeEnum.soundunit, DocumentTypeEnum.track);
        break;

      case DocumentTypeEnum.track:
        hierarchyLevels.push(DocumentTypeEnum.soundrecording, DocumentTypeEnum.soundunit, DocumentTypeEnum.track);
        break;

      case DocumentTypeEnum.page:
        // Page documents can show their parent hierarchy
        if (document.rootModel) {
          return this.getDocumentHierarchyLevels({ ...document, model: document.rootModel });
        }
        hierarchyLevels.push(DocumentTypeEnum.page);
        break;

      default:
        // For any unknown types, just add the document itself + page
        hierarchyLevels.push(document.model as DocumentTypeEnum, DocumentTypeEnum.page);
        break;
    }

    // Return in the same format as shareableTypes
    return hierarchyLevels.map(level => ({
      model: level,
      pid: ''
    }));
  }

  getShareableDocumentTypes(document: Metadata): any[] {
    let shareableTypes: any[] = [];

    // Get all possible hierarchy levels based on document type
    const hierarchyLevels = this.getDocumentHierarchyLevels(document);

    const urlParam = new URLSearchParams(this.getUrlSearch());
    const articleUuid = urlParam.get('article');

    // Check if we are in article context
    const isArticle = !!articleUuid || document.model === DocumentTypeEnum.article;

    // Add all hierarchy levels with appropriate PIDs
    hierarchyLevels.forEach(level => {
      let pid = '';

      switch (level.model) {
        case DocumentTypeEnum.periodical:
          pid = document.rootPid || (document.model === DocumentTypeEnum.periodical ? document.uuid : '');
          break;
        case DocumentTypeEnum.periodicalvolume:
          if (document.model === DocumentTypeEnum.periodicalvolume) {
            pid = document.uuid;
          } else if (document.model === DocumentTypeEnum.page) {
            if (document.ownParentModel === DocumentTypeEnum.periodicalvolume) {
              pid = document.ownParentPid || (document.volume?.uuid || '');
            } else if (document.ownParentModel === DocumentTypeEnum.periodicalitem) {
              pid = document.volume?.uuid || '';
            }
          } else if (document.model === DocumentTypeEnum.periodicalitem) {
            pid = document.volume?.uuid || '';
          }
          break;
        case DocumentTypeEnum.periodicalitem:
          if (document.model === DocumentTypeEnum.periodicalitem) {
            pid = document.uuid;
          } else if (document.model === DocumentTypeEnum.page && document.ownParentModel === DocumentTypeEnum.periodicalitem) {
            pid = document.ownParentPid;
          }
          break;
        case DocumentTypeEnum.article:
          if (articleUuid) {
            pid = articleUuid;
          } else {
            pid = (document.model === DocumentTypeEnum.article ? document.uuid : '');
          }
          break;
        case DocumentTypeEnum.page:
          // Check if page is in URL params
          if (!isArticle) {
            const urlParams = new URLSearchParams(this.getUrlSearch());
            pid = urlParams.get('page') || (document.model === DocumentTypeEnum.page ? document.uuid : '');
          }
          break;
        default:
          // For other document types (monograph, graphic, map, etc.)
          pid = document.model === level.model ? document.uuid : '';
          break;
      }

      // Only add if we have a valid PID
      if (pid) {
        shareableTypes.push({
          model: level.model,
          pid: pid
        });
      }
    });

    // If we have an article UUID but article wasn't in hierarchy levels (e.g. parent is periodical item), add it
    if (articleUuid && !shareableTypes.find(item => item.model === DocumentTypeEnum.article)) {
      shareableTypes.push({
        model: DocumentTypeEnum.article,
        pid: articleUuid
      });
    }

    // Legacy logic for backward compatibility
    if (document.rootModel && !shareableTypes.find(item => item.model === document.rootModel)) {
      shareableTypes.push({
        model: document.rootModel,
        pid: document.rootPid
      })
    }

    // if rootModel is periodical, add periodical volume (backward compatibility)
    if (document.rootModel === 'periodical' && document.model !== 'periodical' && document.volume) {
      if (document.model === 'periodicalvolume' && !shareableTypes.find(item => item.model === 'periodicalvolume')) {
        shareableTypes.push({
          model: 'periodicalvolume',
          pid: document.uuid
        });
      } else if (!shareableTypes.find(item => item.model === 'periodicalvolume')) {
        if (document.volume.uuid) {
          shareableTypes.push({
            model: 'periodicalvolume',
            pid: document.volume.uuid
          })
        }
      }
    }

    if (document.model !== 'periodical' && document.model !== 'periodicalvolume' && !shareableTypes.find(item => item.model === document.model)) {
      shareableTypes.push({
        model: document.model,
        pid: document.uuid
      });
    }

    // if in url is ?page=uuid, then add it to the list (backward compatibility)
    const urlParams = new URLSearchParams(this.getUrlSearch());
    const pageUuid = urlParams.get('page');
    if (pageUuid && !shareableTypes.find(item => item.model === 'page') && !isArticle) {
      shareableTypes.push({
        model: 'page',
        pid: pageUuid
      });
    }

    // remove duplicates
    const uniqueShareableTypes = new Map();
    shareableTypes.forEach(item => {
      const key = `${item.model}-${item.pid}`;
      if (!uniqueShareableTypes.has(key)) {
        uniqueShareableTypes.set(key, item);
      }
    });

    // Convert back to array
    shareableTypes = Array.from(uniqueShareableTypes.values());

    // reverse order
    shareableTypes.reverse();

    return shareableTypes;
  }

  onNavigate(event: MouseEvent, url: string) {
    const isModifiedClick =
      event.ctrlKey || event.metaKey || event.shiftKey || event.button !== 0;

    if (!isModifiedClick) {
      event.preventDefault();

      // Check if this is a navigation to a periodical page
      const isPeriodicalNavigation = url.includes(`/${APP_ROUTES_ENUM.PERIODICAL_VIEW}/`);
      const isSearchResultsUrl = this.router.url.includes(APP_ROUTES_ENUM.SEARCH_RESULTS);

      if (isSearchResultsUrl) {
        this.searchService.backupCurrentSearchUrl();
      }

      if (isPeriodicalNavigation) {
        // Preserve specific filters from current route when navigating to periodicals
        const enhancedUrl = this.addFiltersToUrl(url);
        this.router.navigateByUrl(enhancedUrl);
      } else {
        this.router.navigateByUrl(url);
      }
    }
  }

  /**
   * Add preserved filters from current route to the target URL
   */
  private addFiltersToUrl(url: string): string {
    const currentParams = this.route.snapshot.queryParams;
    const filtersToAdd: any = {};

    // Extract filters that should be preserved
    for (const filterKey of this.FILTERS_TO_PRESERVE) {
      if (currentParams[filterKey] !== undefined) {
        filtersToAdd[filterKey] = currentParams[filterKey];
      }
    }
    console.log('currentParams::', currentParams)

    // Also preserve relevant customSearch filters
    const customSearch = currentParams['customSearch'];
    console.log('customsearch:', customSearch)
    if (customSearch) {
      const customFilters = customSearch.split(',');
      const relevantCustomFilters = customFilters.filter((filter: string) =>
        this.FILTERS_TO_PRESERVE.some(preserveKey => filter.startsWith(`${preserveKey}:`))
      );
      if (relevantCustomFilters.length > 0) {
        filtersToAdd['customSearch'] = relevantCustomFilters.join(',');
      }
    }

    // Preserve fq parameters that match any key in FILTERS_TO_PRESERVE
    const fq = currentParams['fq'];
    if (fq) {
      const fqFilters = Array.isArray(fq) ? fq : [fq];
      const relevantFqFilters = fqFilters.filter((filter: string) =>
        this.FILTERS_TO_PRESERVE.some(preserveKey => filter.startsWith(`${preserveKey}:`))
      );
      if (relevantFqFilters.length > 0) {
        console.log('relevantFqFilters:', relevantFqFilters);
        filtersToAdd['fq'] = relevantFqFilters;
      }
    }



    // If no filters to add, return original URL
    if (Object.keys(filtersToAdd).length === 0) {
      return url;
    }

    // Parse the URL and add query parameters
    const [basePath, existingParams] = url.split('?');
    const urlParams = new URLSearchParams(existingParams || '');

    // Add preserved filters
    for (const [key, value] of Object.entries(filtersToAdd)) {
      if (key === 'fq' && Array.isArray(value)) {
        // Handle multiple fq parameters - each one needs to be added separately
        value.forEach(fqValue => {
          urlParams.append('fq', fqValue);
        });
      } else {
        urlParams.set(key, value as string);
      }
    }

    return `${basePath}?${urlParams.toString()}`;
  }

  isRecordLocked(licenses: string[]): boolean {
    // Check if the record contains any license from ONLINE_LICENSES
    const hasOnlineLicense = licenses.some(license => PUBLIC_LICENSES.includes(license));

    // Return false if it contains an online license, otherwise return true
    return !hasOnlineLicense;
  }

  goBackClicked(document: any): void {
    // Turn off admin mode when navigating back
    if (this.adminSelectionService.adminMode()) {
      this.adminSelectionService.toggleAdminMode();
    }

    if (document.ownParentPid) {
      this.router.navigate([APP_ROUTES_ENUM.PERIODICAL_VIEW, document.ownParentPid])
    }
    //window.history.back();
  }

  shouldShowBackButton(document: any): boolean {
    return !!document.ownParentPid;
  }

  // Badge Layout Detection Methods

  /**
   * Converts a SearchDocument to RecordItem with badge layout consideration
   * If any item in the provided array should show a badge, all items get the 'with-badge' class
   */
  searchDocumentToRecordItemWithBadgeLayout(doc: SearchDocument, allDocs: SearchDocument[]): RecordItem {
    const recordItem = searchDocumentToRecordItem(doc);

    if (this.shouldAnySearchDocumentShowBadge(allDocs)) {
      recordItem.className = this.addWithBadgeClass(recordItem.className);
    }

    return recordItem;
  }

  /**
   * Converts a PeriodicalItemChild to RecordItem with badge layout consideration
   * If any item in the provided array should show a badge, all items get the 'with-badge' class
   */
  periodicalChildToRecordItemWithBadgeLayout(
    item: PeriodicalItemChild,
    allItems: PeriodicalItemChild[],
    subtitlePrefix: string,
    getItemTitle: (item: PeriodicalItemChild) => string
  ): RecordItem {
    const recordItem: RecordItem = {
      id: item.pid,
      title: getItemTitle(item),
      subtitle: `${subtitlePrefix} ${item['part.number.str']}`,
      model: item.model as DocumentTypeEnum,
      licenses: item['licenses.facet'] || [],
      className: 'card--fluid',
      showFavoriteButton: false,
      showAccessibilityBadge: true
    };

    if (this.shouldAnyPeriodicalChildShowBadge(allItems)) {
      recordItem.className = this.addWithBadgeClass(recordItem.className);
    }

    return recordItem;
  }

  /**
   * Converts a PeriodicalItemYear to RecordItem with badge layout consideration
   * If any item in the provided array should show a badge, all items get the 'with-badge' class
   */
  periodicalYearToRecordItemWithBadgeLayout(year: PeriodicalItemYear, allYears: PeriodicalItemYear[]): RecordItem {
    const recordItem: RecordItem = {
      id: year.pid,
      title: year.year,
      model: year.model as DocumentTypeEnum,
      licenses: year.licenses || [],
      className: 'card--fluid',
      showFavoriteButton: false,
      showAccessibilityBadge: true
    };

    if (this.shouldAnyPeriodicalYearShowBadge(allYears)) {
      recordItem.className = this.addWithBadgeClass(recordItem.className);
    }

    return recordItem;
  }

  /**
   * Check if any SearchDocument in the array should show an accessibility badge
   */
  private shouldAnySearchDocumentShowBadge(docs: SearchDocument[]): boolean {
    return docs.some(doc => {
      const licenses = doc.containsLicenses || doc.licenses || [];
      return this.isRecordLocked(licenses);
    });
  }

  /**
   * Check if any PeriodicalItemChild in the array should show an accessibility badge
   */
  private shouldAnyPeriodicalChildShowBadge(items: PeriodicalItemChild[]): boolean {
    return items.some(item => {
      const licenses = item['licenses.facet'] || [];
      return this.isRecordLocked(licenses);
    });
  }

  /**
   * Check if any PeriodicalItemYear in the array should show an accessibility badge
   */
  private shouldAnyPeriodicalYearShowBadge(years: PeriodicalItemYear[]): boolean {
    return years.some(year => {
      const licenses = year.licenses || [];
      return this.isRecordLocked(licenses);
    });
  }

  getUrlSearch(): string {
    return window.location.search;
  }


  /**
   * Adds 'with-badge' class to the existing className string
   */
  private addWithBadgeClass(existingClassName: string | undefined): string {
    const className = existingClassName || '';
    return className.includes('with-badge') ? className : `${className} with-badge`.trim();
  }
}
