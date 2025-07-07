import {inject, Injectable} from '@angular/core';
import {Router} from '@angular/router';
import {DocumentTypeEnum} from '../../modules/constants/document-type';
import {APP_ROUTES_ENUM} from '../../app.routes';
import {SearchDocument} from '../../modules/models/search-document';
import {SearchService} from './search.service';
import {MatDialog} from '@angular/material/dialog';
import {CitationDialogComponent} from '../dialogs/citation-dialog/citation-dialog.component';
import {ShareDialogComponent} from '../dialogs/share-dialog/share-dialog.component';

@Injectable({
  providedIn: 'root'
})
export class RecordHandlerService {

  private dialog = inject(MatDialog);

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
        this.navigateToPeriodical(document.pid);
        break;
      default:
        this.navigateToDetail(document.pid);
    }
  }

  /**
   * Navigate to the document detail view.
   */
  private navigateToDetail(pid: string): void {
    this.router.navigate([APP_ROUTES_ENUM.DETAIL_VIEW, pid]);
  }

  /**
   * Navigate to the year selection page for a periodical.
   */
  private navigateToPeriodical(pid: string): void {
    this.router.navigate([APP_ROUTES_ENUM.PERIODICAL_VIEW, pid]);
  }

  navigateFromPeriodicalToSearchResults(): void {
    const returnUrl = this.searchService.getBackupSearchUrl();
    if (returnUrl) {
      this.router.navigateByUrl(returnUrl);
    } else {
      this.router.navigate([APP_ROUTES_ENUM.SEARCH_RESULTS]);
    }
  }

  openCitationDialog(uuid: string) {
    this.dialog.open(CitationDialogComponent, {
      width: '60vw',
      data: {uuid},
    });
  }

  openShareDialog(uuid: string) {
    this.dialog.open(ShareDialogComponent, {
      width: '60vw',
      data: {uuid},
    })
  }

  /**
   * Return whether the given model is considered periodical.
   */
  isPeriodical(model: string): boolean {
    return model === DocumentTypeEnum.periodical;
  }
}
