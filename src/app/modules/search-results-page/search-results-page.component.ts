import {Component, OnInit} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {loadSearchResults} from '../../state/search/search.actions';
import {Store} from '@ngrx/store';
import {Observable} from 'rxjs';
import {SearchDocument} from '../models/search-document';
import {selectSearchResults} from '../../state/search/search.selectors';

@Component({
  selector: 'app-search-results-page',
  standalone: false,
  templateUrl: './search-results-page.component.html',
  styleUrl: './search-results-page.component.scss'
})
export class SearchResultsPageComponent implements OnInit {
  results$: Observable<SearchDocument[]>;

  constructor(private route: ActivatedRoute, private store: Store) {
    this.results$ = this.store.select(selectSearchResults);
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      const query = params['q'] || '*:*';
      const filters = Array.isArray(params['fq']) ? params['fq'] : [params['fq']].filter(Boolean);
      this.store.dispatch(loadSearchResults({ query, filters }));
    });
  }

}
