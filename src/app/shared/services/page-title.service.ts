import { Injectable, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { Router, NavigationEnd, Event } from '@angular/router';
import { Store } from '@ngrx/store';
import { filter } from 'rxjs/operators';
import { Subscription, Observable } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';

import { APP_ROUTES_ENUM } from '../../app.routes';
import { selectDocumentDetail } from '../state/document-detail/document-detail.selectors';
import { selectPeriodicalMetadata } from '../../modules/periodical/state/periodical-detail/periodical-detail.selectors';
import { selectMonographVolumesParent } from '../state/monograph-volumes/monograph-volumes.selectors';
import { selectCollectionDetail } from '../state/collections/collections.selectors';
import { selectFolderDetails } from '../../modules/saved-lists-page/state/folders.selectors';
import { Metadata } from '../models/metadata.model';

interface MonographParent {
    mainTitle?: string;
    title?: string;
    'root.title'?: string;
}

interface FolderDetails {
    name: string;
}

type DocumentMetadata = Metadata | MonographParent | FolderDetails;

@Injectable({
    providedIn: 'root'
})
export class PageTitleService {
    private titleService = inject(Title);
    private router = inject(Router);
    private store = inject(Store);
    private translate = inject(TranslateService);

    private titleSubscription?: Subscription;
    private readonly defaultTitle = 'Česká digitální knihovna';

    constructor() {
        this.init();
    }

    private init() {
        this.updateTitleBasedOnRoute(this.router.url);

        this.router.events.pipe(
            filter((event: Event): event is NavigationEnd => event instanceof NavigationEnd)
        ).subscribe((event: NavigationEnd) => {
            this.updateTitleBasedOnRoute(event.urlAfterRedirects);
        });
    }

    private updateTitleBasedOnRoute(url: string) {
        if (this.titleSubscription) {
            this.titleSubscription.unsubscribe();
            this.titleSubscription = undefined;
        }

        const urlTree = this.router.parseUrl(url);
        const primaryUrlSegment = urlTree.root.children['primary']?.segments[0]?.path || '';

        switch (primaryUrlSegment) {
            case APP_ROUTES_ENUM.SEARCH:
                this.setTitle(this.defaultTitle);
                break;

            case APP_ROUTES_ENUM.SEARCH_RESULTS:
                this.titleSubscription = this.translate.stream('search.title').subscribe(title => {
                    this.setTitle(`${title} | ${this.defaultTitle}`);
                });
                break;

            case APP_ROUTES_ENUM.DETAIL_VIEW:
            case APP_ROUTES_ENUM.MUSIC_VIEW:
                this.subscribeToDocumentTitle(this.store.select(selectDocumentDetail));
                break;

            case APP_ROUTES_ENUM.PERIODICAL_VIEW:
                this.subscribeToDocumentTitle(this.store.select(selectPeriodicalMetadata));
                break;

            case APP_ROUTES_ENUM.MONOGRAPH_VIEW:
                this.subscribeToDocumentTitle(this.store.select(selectMonographVolumesParent));
                break;

            case APP_ROUTES_ENUM.COLLECTION:
                this.subscribeToDocumentTitle(this.store.select(selectCollectionDetail));
                break;

            case APP_ROUTES_ENUM.SAVED_LISTS:
                this.subscribeToDocumentTitle(this.store.select(selectFolderDetails));
                break;

            default:
                // This covers the root path ('/') and any other unhandled primary segments
                this.setTitle(this.defaultTitle);
                break;
        }
    }

    private subscribeToDocumentTitle(metadataObservable: Observable<DocumentMetadata | null | undefined>) {
        this.titleSubscription = metadataObservable.pipe(
            filter((metadata: DocumentMetadata | null | undefined): metadata is DocumentMetadata => !!metadata)
        ).subscribe((metadata: DocumentMetadata) => {
            let title = '';

            // Safe property access using type assertions or checks
            if ('mainTitle' in metadata && metadata.mainTitle) {
                title = metadata.mainTitle;
            } else if ('title' in metadata && metadata.title) {
                title = metadata.title;
            } else if ('root.title' in metadata && (metadata as any)['root.title']) {
                title = (metadata as any)['root.title'];
            } else if ('name' in metadata && (metadata as any).name) {
                title = (metadata as any).name;
            }

            if (title) {
                this.setTitle(`${title} | ${this.defaultTitle}`);
            } else {
                this.setTitle(this.defaultTitle);
            }
        });
    }

    public setTitle(newTitle: string) {
        this.titleService.setTitle(newTitle);
    }
}
