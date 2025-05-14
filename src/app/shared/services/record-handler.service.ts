import {Injectable} from '@angular/core';
import {Router} from '@angular/router';
import {DocumentTypeEnum} from '../../modules/constants/document-type';
import {APP_ROUTES_ENUM} from '../../app.routes';
import {SearchDocument} from '../../modules/models/search-document';

@Injectable({
  providedIn: 'root'
})
export class RecordHandlerService {

  constructor(private router: Router) {}

  /**
   * Handle navigation based on the document type.
   */
  handleDocumentClick(document: SearchDocument): void {
    const model = document.model;

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

  /**
   * Return whether the given model is considered periodical.
   */
  isPeriodical(model: string): boolean {
    return model === DocumentTypeEnum.periodical;
  }
}
