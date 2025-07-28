import { Injectable } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Observable } from 'rxjs';
import { FilterService } from '../../../shared/services/filter.service';
import { Store } from '@ngrx/store';
import {map} from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class PeriodicalFilterService implements FilterService {
  constructor(
    private store: Store
  ) {}

  getFacets(): Observable<any> {
    // todo implement
    return this.store.pipe()
  }

  getFiltersWithOperators(): Observable<Record<string, string>> {
    // todo implement, now just return empty object
    return this.store.pipe(
      map(() => ({}))
    );
  }

  toggleFilter(route: ActivatedRoute, fullValue: string): void {
    // Implement filter toggle logic for periodicals
    const [facetKey, value] = fullValue.split(':');
    // Add your periodical-specific filter toggle logic here
  }

  resetPage() {

  }
}
