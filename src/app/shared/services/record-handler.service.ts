import {inject, Injectable} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {DocumentTypeEnum} from '../../modules/constants/document-type';
import {APP_ROUTES_ENUM} from '../../app.routes';
import {SearchDocument} from '../../modules/models/search-document';
import {SearchService} from './search.service';
import {MatDialog} from '@angular/material/dialog';
import {CitationDialogComponent} from '../dialogs/citation-dialog/citation-dialog.component';
import {ShareDialogComponent} from '../dialogs/share-dialog/share-dialog.component';
import {Metadata} from '../models/metadata.model';
import {ONLINE_LICENSES, PUBLIC_LICENSES} from '../../core/solr/solr-misc';
import {customDefinedFacetsEnum, facetKeysEnum} from '../../modules/search-results-page/const/facets';

@Injectable({
  providedIn: 'root'
})
export class RecordHandlerService {

  private dialog = inject(MatDialog);
  private route = inject(ActivatedRoute);

  // Filter keys that should be preserved when navigating to periodicals
  private readonly FILTERS_TO_PRESERVE = ['yearFrom', 'yearTo', 'dateFrom', 'dateTo', 'dateOffset', customDefinedFacetsEnum.accessibility, facetKeysEnum.license];

  constructor(
    private router: Router,
    private searchService: SearchService
  ) {}

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
      case DocumentTypeEnum.page:
        // DETAIL_VIEW/rootPid?page=pid
        if (rootPid) {
          return this.router.createUrlTree([APP_ROUTES_ENUM.DETAIL_VIEW, rootPid], {queryParams: {page: pid}}).toString();
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

  private navigateToMusic(pid: string): void {
    this.router.navigate([APP_ROUTES_ENUM.MUSIC_VIEW, pid]);
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
    this.dialog.open(CitationDialogComponent, {
      width: '60vw',
      data: {document},
    });
  }

  openShareDialog(document: Metadata | null) {
    if (!document) {
      console.warn('No document provided for share dialog.');
      return;
    }
    this.dialog.open(ShareDialogComponent, {
      width: '60vw',
      data: {document},
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

  getShareableDocumentTypes(document: Metadata): any[] {
    let shareableTypes = [];

    if (document.rootModel) {
      shareableTypes.push({
        model: document.rootModel,
        pid: document.rootPid
      })
    }

    // if rootModel is periodical, add periodical volume
    if (document.rootModel === 'periodical' && document.model !== 'periodical' && document.volume) {

      if (document.model === 'periodicalvolume') {
        shareableTypes.push({
          model: 'periodicalvolume',
          pid: document.uuid
        });
      } else {
        shareableTypes.push({
          model: 'periodicalvolume',
          pid: document.volume.uuid
        })
      }
    }

    if (document.model !== 'periodical' && document.model !== 'periodicalvolume') {
      shareableTypes.push({
        model: document.model,
        pid: document.uuid
      });
    }

    // if in url is ?page=uuid, then add it to the list
    const urlParams = new URLSearchParams(window.location.search);
    const pageUuid = urlParams.get('page');
    if (pageUuid) {
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
}
