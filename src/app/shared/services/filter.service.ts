import { Observable } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import {InjectionToken} from '@angular/core';

export const FILTER_SERVICE = new InjectionToken<FilterService>('FilterService');

export interface FilterService {
  load(): Promise<void>;
  getFacets(): Observable<any>;
  getFiltersWithOperators(): Observable<Record<string, string>>;
  toggleFilter(route: ActivatedRoute, fullValue: string): void;
  resetPage(): void;
}
