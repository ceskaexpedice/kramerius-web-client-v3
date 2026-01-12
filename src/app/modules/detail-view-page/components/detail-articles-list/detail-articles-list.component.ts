import { Component, effect, ElementRef, inject, QueryList, ViewChildren } from '@angular/core';
import { AsyncPipe, NgIf } from '@angular/common';
import { DetailArticleItemComponent } from '../detail-article-item/detail-article-item.component';
import { DetailViewService } from '../../services/detail-view.service';

@Component({
  selector: 'app-detail-articles-list',
  standalone: true,
  imports: [
    NgIf,
    AsyncPipe,
    DetailArticleItemComponent,
  ],
  templateUrl: './detail-articles-list.component.html',
  styleUrl: './detail-articles-list.component.scss'
})
export class DetailArticlesListComponent {
  public detailViewService = inject(DetailViewService);

  @ViewChildren(DetailArticleItemComponent, { read: ElementRef })
  articleItems!: QueryList<ElementRef>;

  constructor() {
    effect(() => {
      const index = this.detailViewService.currentArticleIndex;
      queueMicrotask(() => this.scrollToActiveArticle());
    });
  }

  clickedArticle(index: number) {
    this.detailViewService.goToArticle(index);
  }

  scrollToActiveArticle() {
    const index = this.detailViewService.currentArticleIndex;
    const el = this.articleItems.get(index)?.nativeElement as HTMLElement;
    el?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'nearest'
    });
  }
}
