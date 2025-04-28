import { Injectable } from "@angular/core";
import { QueryParamsService } from "./QueryParamsManager";
import { Store } from "@ngrx/store";
import { FacetItem } from "../../modules/models/facet-item";

@Injectable({
  providedIn: 'root'
})
export class FilterService {
  constructor(
    private queryParamsService: QueryParamsService,
    private store: Store
  ) {}

  /**
   * Group filters by field
   */
  groupFiltersByField(filters: string[]): Map<string, string[]> {
    const filtersByField = new Map<string, string[]>();

    filters.forEach(filter => {
      const [field, value] = filter.split(':');
      if (!filtersByField.has(field)) {
        filtersByField.set(field, []);
      }
      filtersByField.get(field)?.push(value);
    });

    return filtersByField;
  }

  /**
   * Sort items moving selected ones to the top
   */
  sortWithSelectedOnTop(items: FacetItem[], selectedValues: Set<string>): FacetItem[] {
    return [...items].sort((a, b) => {
      const aSelected = selectedValues.has(a.name);
      const bSelected = selectedValues.has(b.name);

      if (aSelected && !bSelected) return -1;
      if (!aSelected && bSelected) return 1;
      return 0;
    });
  }

  /**
   * Build Solr filter query with proper operators
   */
  buildFilterQuery(
    field: string,
    values: string[],
    operator: 'AND' | 'OR'
  ): string {
    const escapedValues = values.map(v => `"${v}"`);

    if (values.length === 1) {
      return `${field}:${escapedValues[0]}`;
    } else {
      return `${field}:(${escapedValues.join(` ${operator} `)})`;
    }
  }
}
