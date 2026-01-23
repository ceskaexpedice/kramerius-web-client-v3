import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SolrService } from '../../../core/solr/solr.service';
import { RecordHandlerService } from '../../services/record-handler.service';
import { switchMap, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { APP_ROUTES_ENUM } from '../../../app.routes';
import {DocumentTypeEnum} from '../../../modules/constants/document-type';

@Component({
  selector: 'app-uuid-redirect',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="uuid-redirect-container">
      <div class="loading-message">
        <div class="spinner"></div>
        <p>Redirecting...</p>
      </div>
    </div>
  `,
  styles: [`
    .uuid-redirect-container {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      width: 100%;
    }
    .loading-message {
      text-align: center;
    }
    .spinner {
      border: 4px solid #f3f3f3;
      border-top: 4px solid #3498db;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      animation: spin 2s linear infinite;
      margin: 0 auto 20px;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `]
})
export class UuidRedirectComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private solrService = inject(SolrService);
  private recordHandlerService = inject(RecordHandlerService);

  ngOnInit(): void {
    const uuid = this.route.snapshot.params['uuid'];
    const queryParams = this.route.snapshot.queryParams;

    if (!uuid) {
      this.redirectToHome();
      return;
    }

    this.redirectBasedOnDocumentType(uuid, queryParams);
  }

  private redirectBasedOnDocumentType(uuid: string, queryParams: any = {}): void {
    this.solrService.getDetailItem(uuid).pipe(
      switchMap(document => {
        if (!document) {
          throw new Error('Document not found');
        }

        const model = document.model;
        let targetRoute: string[];
        let navigationExtras: any = {};

        // Add query parameters if they exist
        if (queryParams && Object.keys(queryParams).length > 0) {
          navigationExtras.queryParams = queryParams;
        }

        switch (model) {
          case 'periodical':
            targetRoute = [APP_ROUTES_ENUM.PERIODICAL_VIEW, uuid];
            break;
          case 'periodicalvolume':
            targetRoute = [APP_ROUTES_ENUM.PERIODICAL_VIEW, uuid];
            break;
          case 'soundrecording':
            targetRoute = [APP_ROUTES_ENUM.MUSIC_VIEW, uuid];
            break;
          case DocumentTypeEnum.convolute:
            targetRoute = [APP_ROUTES_ENUM.MONOGRAPH_VIEW, uuid];
            break;
          case 'page':
            targetRoute = [APP_ROUTES_ENUM.DETAIL_VIEW, document['root.pid']];
            navigationExtras.queryParams = { ...navigationExtras.queryParams, page: uuid };
            break;
          default:
            targetRoute = [APP_ROUTES_ENUM.DETAIL_VIEW, uuid];
            break;
        }

        this.router.navigate(targetRoute, navigationExtras);
        return of(null);
      }),
      catchError(error => {
        console.error('Error fetching document details:', error);
        this.redirectToHome();
        return of(null);
      })
    ).subscribe();
  }

  private redirectToHome(): void {
    this.router.navigate([APP_ROUTES_ENUM.SEARCH]);
  }
}
