import {Component, inject, OnInit} from '@angular/core';
import {SearchService} from '../../../../shared/services/search.service';
import { TranslateService } from '@ngx-translate/core';

export interface SuggestedSearchTag {
  text: string;
  filter: string;
}

@Component({
  selector: 'app-suggested-search-tags-section',
  imports: [],
  templateUrl: './suggested-search-tags-section.component.html',
  styleUrl: './suggested-search-tags-section.component.scss'
})
export class SuggestedSearchTagsSectionComponent implements OnInit {
  private translateService = inject(TranslateService);

  suggestedTags: SuggestedSearchTag[] = [];

  public searchService = inject(SearchService);

  ngOnInit() {
    this.initializeSuggestedTags();
  }

  private initializeSuggestedTags() {
    this.suggestedTags = [
      { text: this.translateService.instant('search.suggestions.capek-books'), filter: '?query=&page=1&pageSize=60&sortBy=score&sortDirection=desc&fq=licenses.facet:public&fq=authors.facet:Čapek,%20Karel&licenses.facet_operator=OR&authors.facet_operator=OR&customSearch=custom-root-model:monograph' },
      { text: this.translateService.instant('search.suggestions.17th-century-graphics'), filter: '?query=&page=1&pageSize=60&sortBy=date.min&sortDirection=asc&customSearch=custom-root-model:graphic&advSearch=(date.str:%5B1600%20TO%201700%5D)&advOp=AND' },
      { text: this.translateService.instant('search.suggestions.kejrova-cookbooks'), filter: '?query=&page=1&pageSize=60&sortBy=title.sort&sortDirection=asc&fq=licenses.facet:public&fq=authors.facet:Kejřová,%20Anuše&licenses.facet_operator=OR&authors.facet_operator=OR' },
      { text: this.translateService.instant('search.suggestions.16th-century-maps'), filter: '?page=1&pageSize=60&sortBy=title.sort&sortDirection=asc&fq=licenses.facet:public&licenses.facet_operator=OR&customSearch=custom-root-model:map&advSearch=(date.str:%5B1500%20TO%201600%5D)&advOp=AND' },
      { text: this.translateService.instant('search.suggestions.audio-recordings'), filter: '?page=1&pageSize=60&sortBy=title.sort&sortDirection=asc&fq=licenses.facet:public&licenses.facet_operator=OR&customSearch=custom-root-model:soundrecording' },
    ];
  }

  onTagSelected(filter: string) {
    this.searchService.redirectDirectlyToUrl(filter);
  }

}
