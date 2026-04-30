import { Component, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EpubService } from '../../services/epub.service';
import { SearchDebounceService } from '../../services/search-debounce.service';
import { InputComponent } from '../input/input.component';
import { PageNavigatorComponent } from '../page-navigator/page-navigator.component';
import { TranslateModule } from '@ngx-translate/core';
import { DetailArticleItemComponent } from '../../../modules/detail-view-page/components/detail-article-item/detail-article-item.component';
import { SearchNavigationComponent } from '../search-navigation/search-navigation.component';

@Component({
  selector: 'app-epub-sidebar',
  standalone: true,
  imports: [
    CommonModule,
    InputComponent,
    PageNavigatorComponent,
    TranslateModule,
    DetailArticleItemComponent,
    SearchNavigationComponent
  ],
  templateUrl: './epub-sidebar.component.html',
  styleUrl: './epub-sidebar.component.scss'
})
export class EpubSidebarComponent implements OnDestroy {
  public epubService = inject(EpubService);
  private searchDebounceService = inject(SearchDebounceService);

  navigateTo(href: string): void {
    this.epubService.navigateTo(href);
  }

  goToNext(): void {
    this.epubService.goToNext();
  }

  goToPrevious(): void {
    this.epubService.goToPrevious();
  }

  goToPage(page: number): void {
    this.epubService.goToPage(page);
  }

  onSearchChange(query: string | number): void {
    const searchQuery = typeof query === 'string' ? query : query.toString();

    // Use centralized debounce service instead of manual timeout
    this.searchDebounceService.debounce('epub-search', () => {
      this.epubService.setSearchQuery(searchQuery);
    });
  }

  findNextMatch(): void {
    this.epubService.nextSearchResult();
  }

  findPreviousMatch(): void {
    this.epubService.prevSearchResult();
  }

  getArticleWrapper(node: any): any {
    return {
      title: node.label,
      pid: node.href
    };
  }

  ngOnDestroy(): void {
    this.searchDebounceService.cancel('epub-search');
  }
}
