import { Observable } from 'rxjs';
import { ActivatedRoute } from '@angular/router';

export interface FilterService {
  getFacets(): Observable<any>;
  getFiltersWithOperators(): Observable<Record<string, string>>;
  toggleFilter(route: ActivatedRoute, fullValue: string): void;
}
