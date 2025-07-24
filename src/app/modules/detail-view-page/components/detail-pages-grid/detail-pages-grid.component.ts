import {Component, effect, ElementRef, inject, Input, QueryList, ViewChildren} from '@angular/core';
import {AsyncPipe, NgClass, NgIf} from '@angular/common';
import {DetailPageItemComponent} from '../detail-page-item/detail-page-item.component';
import {DetailViewService} from '../../services/detail-view.service';

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
      const index = this.detailViewService.currentPageIndex;
      queueMicrotask(() => this.scrollToActivePage());
    });
  }

  clickedPage(index: number) {
    this.detailViewService.goToPage(index);
  }

  scrollToActivePage() {
    const index = this.detailViewService.currentPageIndex;
    const el = this.pageItems.get(index)?.nativeElement as HTMLElement;
    el?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'nearest'
    });
  }

}
