import {Component, effect, ElementRef, inject, Input, QueryList, ViewChildren} from '@angular/core';
import {AsyncPipe, NgClass, NgIf} from '@angular/common';
import {DetailPageItemComponent} from '../detail-page-item/detail-page-item.component';
import {DetailViewService} from '../../services/detail-view.service';
import {Page} from '../../../../shared/models/page.model';
import {take} from 'rxjs';

@Component({
  selector: 'app-detail-pages-grid',
  imports: [
    NgIf,
    AsyncPipe,
    DetailPageItemComponent,
    NgClass,
  ],
  templateUrl: './detail-pages-grid.component.html',
  styleUrl: './detail-pages-grid.component.scss'
})
export class DetailPagesGridComponent {
  public detailViewService = inject(DetailViewService);

  @ViewChildren(DetailPageItemComponent, { read: ElementRef })
  pageItems!: QueryList<ElementRef>;

  @Input() type: 'recording' | 'page' = 'page';

  constructor() {
    effect(() => {
      const _index = this.detailViewService.currentPageIndex;
      queueMicrotask(() => this.scrollToActivePage());
    });
  }

  clickedPage(pid: string) {
    this.detailViewService.navigateToPage(pid);
  }

  scrollToActivePage() {
    const currentPid = this.detailViewService.currentPagePid;
    if (!currentPid) return;

    this.detailViewService.pagesOnly$.pipe(take(1)).subscribe((pages: Page[] | undefined) => {
      if (!pages) return;
      const index = pages.findIndex(p => p.pid === currentPid);
      if (index !== -1) {
        const el = this.pageItems.get(index)?.nativeElement as HTMLElement;
        el?.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'nearest'
        });
      }
    });
  }

}
