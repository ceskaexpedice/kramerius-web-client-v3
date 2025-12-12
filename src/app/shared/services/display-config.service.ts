import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import {
  DisplayConfig,
  TableColumnConfig,
  DEFAULT_TABLE_COLUMNS,
  FacetFilterConfig,
  DEFAULT_FACET_FILTERS
} from '../models/display-config.model';
import { OPTIONAL_SOLR_FIELDS } from '../../modules/search-results-page/const/search-return-fields';

@Injectable({
  providedIn: 'root'
})
export class DisplayConfigService {
  private _displayConfig = new BehaviorSubject<DisplayConfig>(this.getDefaultConfig());
  public displayConfig$ = this._displayConfig.asObservable();

  constructor() {}

  /**
   * Gets the current display configuration
   */
  get displayConfig(): DisplayConfig {
    return this._displayConfig.value;
  }

  /**
   * Sets the display configuration
   */
  set displayConfig(config: DisplayConfig) {
    this._displayConfig.next(config);
  }

  /**
   * Gets all table columns (visible and hidden)
   */
  getAllColumns(): TableColumnConfig[] {
    return this._displayConfig.value.tableColumns.sort((a, b) => a.order - b.order);
  }

  /**
   * Gets only visible table columns, sorted by order
   */
  getVisibleColumns(): TableColumnConfig[] {
    return this._displayConfig.value.tableColumns
      .filter(col => col.visible)
      .sort((a, b) => a.order - b.order);
  }

  /**
   * Gets only hidden table columns
   */
  getHiddenColumns(): TableColumnConfig[] {
    return this._displayConfig.value.tableColumns
      .filter(col => !col.visible)
      .sort((a, b) => a.order - b.order);
  }

  /**
   * Toggles visibility of a column by ID
   */
  toggleColumnVisibility(columnId: string): void {
    const config = this._displayConfig.value;
    const column = config.tableColumns.find(col => col.id === columnId);

    if (column) {
      column.visible = !column.visible;
      this._displayConfig.next({ ...config });
    }
  }

  /**
   * Sets visibility for a specific column
   */
  setColumnVisibility(columnId: string, visible: boolean): void {
    const config = this._displayConfig.value;
    const column = config.tableColumns.find(col => col.id === columnId);

    if (column) {
      column.visible = visible;
      this._displayConfig.next({ ...config });
    }
  }

  /**
   * Updates multiple column visibilities at once
   */
  updateColumnVisibilities(visibilities: { [columnId: string]: boolean }): void {
    const config = this._displayConfig.value;

    Object.entries(visibilities).forEach(([columnId, visible]) => {
      const column = config.tableColumns.find(col => col.id === columnId);
      if (column) {
        column.visible = visible;
      }
    });

    this._displayConfig.next({ ...config });
  }

  /**
   * Reorders columns (for future drag-and-drop functionality)
   */
  reorderColumns(columnIds: string[]): void {
    const config = this._displayConfig.value;

    columnIds.forEach((id, index) => {
      const column = config.tableColumns.find(col => col.id === id);
      if (column) {
        column.order = index;
      }
    });

    this._displayConfig.next({ ...config });
  }

  /**
   * Resets all columns to their default visibility state
   */
  resetToDefaults(): void {
    this._displayConfig.next(this.getDefaultConfig());
  }

  /**
   * Loads configuration from settings object
   */
  loadFromSettings(displayConfig?: DisplayConfig): void {
    if (displayConfig) {
      // Merge saved config with defaults to ensure all columns and filters exist
      const mergedColumns = this.mergeColumnsWithDefaults(displayConfig.tableColumns);
      const mergedFilters = this.mergeFacetFiltersWithDefaults(displayConfig.facetFilters || []);
      this._displayConfig.next({
        ...displayConfig,
        tableColumns: mergedColumns,
        facetFilters: mergedFilters
      });
    } else {
      this._displayConfig.next(this.getDefaultConfig());
    }
  }

  /**
   * Gets configuration to save to settings
   */
  getConfigForSettings(): DisplayConfig {
    return this._displayConfig.value;
  }

  /**
   * Merges saved columns with default columns to handle new columns added in updates
   */
  private mergeColumnsWithDefaults(savedColumns: TableColumnConfig[]): TableColumnConfig[] {
    const merged = [...DEFAULT_TABLE_COLUMNS];

    savedColumns.forEach(savedCol => {
      const index = merged.findIndex(col => col.id === savedCol.id);
      if (index !== -1) {
        // Update existing column with saved settings
        merged[index] = { ...merged[index], ...savedCol };
      }
    });

    return merged;
  }

  /**
   * Merges saved facet filters with default facet filters to handle new filters added in updates
   */
  private mergeFacetFiltersWithDefaults(savedFilters: FacetFilterConfig[]): FacetFilterConfig[] {
    const merged = [...DEFAULT_FACET_FILTERS];

    savedFilters.forEach(savedFilter => {
      const index = merged.findIndex(filter => filter.id === savedFilter.id);
      if (index !== -1) {
        // Update existing filter with saved settings
        merged[index] = { ...merged[index], ...savedFilter };
      }
    });

    return merged;
  }

  /**
   * Gets the Solr fields to request based on visible columns
   * This optimizes API calls by only requesting data for visible columns
   */
  getSolrFieldsForVisibleColumns(): string[] {
    const visibleColumns = this.getVisibleColumns();
    const solrFields: string[] = [];

    visibleColumns.forEach(column => {
      // Check if this column has associated Solr fields
      if (OPTIONAL_SOLR_FIELDS[column.id]) {
        solrFields.push(...OPTIONAL_SOLR_FIELDS[column.id]);
      }
    });

    return solrFields;
  }

  /**
   * Gets all facet filters (visible and hidden)
   */
  getAllFacetFilters(): FacetFilterConfig[] {
    const config = this._displayConfig.value;
    if (!config.facetFilters || config.facetFilters.length === 0) {
      return [...DEFAULT_FACET_FILTERS];
    }
    return config.facetFilters.sort((a, b) => a.order - b.order);
  }

  /**
   * Gets only visible facet filters, sorted by order
   */
  getVisibleFacetFilters(): FacetFilterConfig[] {
    return this.getAllFacetFilters()
      .filter(filter => filter.visible)
      .sort((a, b) => a.order - b.order);
  }

  /**
   * Gets only hidden facet filters
   */
  getHiddenFacetFilters(): FacetFilterConfig[] {
    return this.getAllFacetFilters()
      .filter(filter => !filter.visible)
      .sort((a, b) => a.order - b.order);
  }

  /**
   * Toggles visibility of a facet filter by ID
   */
  toggleFacetFilterVisibility(filterId: string): void {
    const config = this._displayConfig.value;
    const filters = config.facetFilters || [...DEFAULT_FACET_FILTERS];
    const filter = filters.find(f => f.id === filterId);

    if (filter) {
      filter.visible = !filter.visible;
      this._displayConfig.next({ ...config, facetFilters: filters });
    }
  }

  /**
   * Sets visibility for a specific facet filter
   */
  setFacetFilterVisibility(filterId: string, visible: boolean): void {
    const config = this._displayConfig.value;
    const filters = config.facetFilters || [...DEFAULT_FACET_FILTERS];
    const filter = filters.find(f => f.id === filterId);

    if (filter) {
      filter.visible = visible;
      this._displayConfig.next({ ...config, facetFilters: filters });
    }
  }

  /**
   * Updates multiple facet filter visibilities at once
   */
  updateFacetFilterVisibilities(visibilities: { [filterId: string]: boolean }): void {
    const config = this._displayConfig.value;
    const filters = config.facetFilters || [...DEFAULT_FACET_FILTERS];

    Object.entries(visibilities).forEach(([filterId, visible]) => {
      const filter = filters.find(f => f.id === filterId);
      if (filter) {
        filter.visible = visible;
      }
    });

    this._displayConfig.next({ ...config, facetFilters: filters });
  }

  /**
   * Reorders facet filters (for drag-and-drop functionality)
   */
  reorderFacetFilters(filterIds: string[]): void {
    const config = this._displayConfig.value;
    const filters = config.facetFilters || [...DEFAULT_FACET_FILTERS];

    filterIds.forEach((id, index) => {
      const filter = filters.find(f => f.id === id);
      if (filter) {
        filter.order = index;
      }
    });

    this._displayConfig.next({ ...config, facetFilters: filters });
  }

  /**
   * Returns the default configuration
   */
  private getDefaultConfig(): DisplayConfig {
    return {
      tableColumns: [...DEFAULT_TABLE_COLUMNS],
      facetFilters: [...DEFAULT_FACET_FILTERS]
    };
  }
}
