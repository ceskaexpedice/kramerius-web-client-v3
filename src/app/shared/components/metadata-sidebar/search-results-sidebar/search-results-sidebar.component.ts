import { Component, inject, OnDestroy, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SearchService } from '../../../services/search.service';
import { DetailViewService } from '../../../../modules/detail-view-page/services/detail-view.service';
import { RecordHandlerService } from '../../../services/record-handler.service';
import { SearchDocument } from '../../../../modules/models/search-document';
import { Subscription, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { PaginatorComponent } from '../../paginator/paginator.component';
import { TranslateModule } from '@ngx-translate/core';
import { RecordItemComponent } from '../../record-item/record-item.component';
import { RecordItem, searchDocumentToRecordItem } from '../../record-item/record-item.model';
import { Metadata } from '../../../models/metadata.model';

@Component({
    selector: 'app-search-results-sidebar',
    standalone: true,
    imports: [
        CommonModule,
        PaginatorComponent,
        TranslateModule,
        RecordItemComponent,
    ],
    templateUrl: './search-results-sidebar.component.html',
    styleUrls: ['./search-results-sidebar.component.scss']
})
export class SearchResultsSidebarComponent implements OnInit, OnDestroy {
    public searchService = inject(SearchService);
    public detailService = inject(DetailViewService, { optional: true });
    public recordHandler = inject(RecordHandlerService);

    @Input() currentDocument: SearchDocument | Metadata | null = null;

    // Combined results from all categories
    results: SearchDocument[] = [];

    private subscriptions: Subscription[] = [];
    private pendingNavigation: 'prev' | 'next' | null = null;

    ngOnInit() {
        // Combine results from all possible streams in search service to show in one list
        this.subscriptions.push(
            combineLatest([
                this.searchService.nonPageResults$,
                this.searchService.articleResults$,
                this.searchService.pageResults$,
                this.searchService.attachmentResults$
            ]).pipe(
                map(([nonPage, article, page, attachment]) => {
                    const allDocs: SearchDocument[] = [];
                    if (nonPage) allDocs.push(...nonPage);
                    if (article) allDocs.push(...article);
                    if (page) allDocs.push(...page);
                    if (attachment) allDocs.push(...attachment);
                    return allDocs;
                })
            ).subscribe(docs => {
                this.results = docs;

                // Handle pending cross-page navigation
                if (this.pendingNavigation && this.results.length > 0) {
                    if (this.pendingNavigation === 'next') {
                        // Navigate to first item of new page
                        this.navigateToItem(this.results[0]);
                    } else if (this.pendingNavigation === 'prev') {
                        // Navigate to last item of new page
                        this.navigateToItem(this.results[this.results.length - 1]);
                    }
                    this.pendingNavigation = null;
                }
            })
        );
    }

    onPreviousResult(event: MouseEvent) {
        const currentIndex = this.getCurrentItemIndex();
        if (currentIndex === -1) return;

        if (currentIndex > 0) {
            this.navigateToItem(this.results[currentIndex - 1], event);
        } else {
            // Load previous page
            const currentPage = this.searchService.page;
            if (currentPage > 1) {
                this.pendingNavigation = 'prev';
                this.searchService.goToPageLocal(currentPage - 1);
            }
        }
    }

    onNextResult(event: MouseEvent) {
        const currentIndex = this.getCurrentItemIndex();
        if (currentIndex === -1) return;

        if (currentIndex < this.results.length - 1) {
            this.navigateToItem(this.results[currentIndex + 1], event);
        } else {
            // Load next page
            const currentPage = this.searchService.page;
            // We don't know total pages easily here without calculation, but searchService.totalCount is available
            const totalPages = Math.ceil((this.searchService.totalCount || 0) / this.searchService.pageSize);

            if (currentPage < totalPages) {
                this.pendingNavigation = 'next';
                this.searchService.goToPageLocal(currentPage + 1);
            }
        }
    }

    public getCurrentItemIndex(): number {
        const currentDoc = this.currentDocument || this.detailService?.document;
        // SearchDocument uses 'pid', Metadata uses 'uuid'
        const currentPid = (currentDoc as any)?.pid || (currentDoc as any)?.uuid;
        if (!currentPid) return -1;
        return this.results.findIndex(r => r.pid === currentPid);
    }

    private navigateToItem(item: SearchDocument, event: MouseEvent | null = null) {
        let url = '';
        const pid = item.pid;
        const model = item.model;
        const ownParentPid = item.ownParentPid;

        url = this.recordHandler.getHandleDocumentUrlByModelAndPid(model as any, pid, ownParentPid);

        if (url) {
            const navEvent = event || {
                ctrlKey: false,
                metaKey: false,
                shiftKey: false,
                button: 0,
                preventDefault: () => { }
            } as any;

            this.recordHandler.onNavigate(navEvent, url);
        }
    }

    onPageChange(page: number) {
        this.searchService.goToPageLocal(page);
    }

    onPageSizeChange(size: number) {
        this.searchService.changePageSizeLocal(size);
    }

    ngOnDestroy() {
        this.subscriptions.forEach(sub => sub.unsubscribe());
    }

    toRecordItem(doc: SearchDocument): RecordItem {
        return searchDocumentToRecordItem(doc);
    }
}
