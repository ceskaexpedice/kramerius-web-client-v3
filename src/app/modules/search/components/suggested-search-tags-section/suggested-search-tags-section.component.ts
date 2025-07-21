import {Component, inject} from '@angular/core';
import {SearchService} from '../../../../shared/services/search.service';

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
export class SuggestedSearchTagsSectionComponent {

  suggestedTags: SuggestedSearchTag[] = [
    { text: 'Knihy Karla Čapka', filter: '?query=&page=1&pageSize=60&sortBy=score&sortDirection=desc&fq=licenses.facet:public&fq=authors.facet:Čapek,%20Karel&licenses.facet_operator=OR&authors.facet_operator=OR&customSearch=custom-root-model:monograph' },
    { text: 'Grafiky ze 17. století', filter: '?query=&page=1&pageSize=60&sortBy=date.min&sortDirection=asc&customSearch=custom-root-model:graphic&advSearch=(date.str:%5B1600%20TO%201700%5D)&advOp=AND' },
    { text: 'Kuchařky Anuše Kejřové', filter: '?query=&page=1&pageSize=60&sortBy=title.sort&sortDirection=asc&fq=licenses.facet:public&fq=authors.facet:Kejřová,%20Anuše&licenses.facet_operator=OR&authors.facet_operator=OR' },
    { text: 'Mapy 16. století', filter: '?page=1&pageSize=60&sortBy=title.sort&sortDirection=asc&fq=licenses.facet:public&licenses.facet_operator=OR&customSearch=custom-root-model:map&advSearch=(date.str:%5B1500%20TO%201600%5D)&advOp=AND' },
    { text: 'Zvukové nahrávky', filter: '?page=1&pageSize=60&sortBy=title.sort&sortDirection=asc&fq=licenses.facet:public&licenses.facet_operator=OR&customSearch=custom-root-model:soundrecording' },
  ];

  public searchService = inject(SearchService);

  onTagSelected(filter: string) {
    this.searchService.redirectDirectlyToUrl(filter);
  }

}
