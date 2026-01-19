import { Component, EventEmitter, inject, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { AppSettingsThemeEnum, AppResultsViewType, Settings } from '../../settings.model';
import {
  ToggleButtonGroupComponent, ToggleOption,
} from '../../../../shared/components/toggle-button-group/toggle-button-group.component';
import { SettingsService } from '../../settings.service';
import { DisplayConfigService } from '../../../../shared/services/display-config.service';
import { TableColumnConfig, FacetFilterConfig } from '../../../../shared/models/display-config.model';
import { CheckboxComponent } from '../../../../shared/components/checkbox/checkbox.component';
import { NgForOf } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import {CdkDragDrop, CdkDrag, CdkDropList, moveItemInArray, CdkDragHandle} from '@angular/cdk/drag-drop';
import { SelectComponent } from '../../../../shared/components/select/select.component';

@Component({
  selector: 'app-settings-display-section',
  imports: [
    ToggleButtonGroupComponent,
    CheckboxComponent,
    NgForOf,
    TranslatePipe,
    CdkDrag,
    CdkDropList,
    CdkDragHandle,
    SelectComponent,
  ],
  templateUrl: './settings-display-section.component.html',
  styleUrl: './settings-display-section.component.scss'
})
export class SettingsDisplaySectionComponent implements OnInit, OnChanges {
  @Input() settings!: Settings;
  @Output() settingsChange = new EventEmitter<Settings>();

  options: ToggleOption<AppSettingsThemeEnum>[] = [];
  viewModeOptions: ToggleOption<AppResultsViewType>[] = [];
  tableColumns: TableColumnConfig[] = [];
  facetFilters: FacetFilterConfig[] = [];
  pageSizeOptions = [60, 120, 180];

  private settingsService = inject(SettingsService);
  private displayConfigService = inject(DisplayConfigService);

  ngOnInit() {
    this.generateToggleButtons();
    this.generateViewModeToggleButtons();
    this.loadTableColumns();
    this.loadFacetFilters();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['settings'] && !changes['settings'].firstChange) {
      this.loadTableColumns();
      this.loadFacetFilters();
    }
  }

  generateToggleButtons() {
    this.options = [
      { label: 'display-light-mode', value: AppSettingsThemeEnum.LIGHT, icon: 'icon-sun-1', iconColor: '--icon-sun-color' },
      { label: 'display-dark-mode', value: AppSettingsThemeEnum.DARK, icon: 'icon-moon', iconColor: '--icon-moon-color' },
      { label: 'display-system-mode', value: AppSettingsThemeEnum.SYSTEM, icon: 'icon-monitor' },
    ];
  }

  generateViewModeToggleButtons() {
    this.viewModeOptions = [
      { value: AppResultsViewType.grid, icon: 'icon-row-horizontal', ariaLabel: 'view-grid--arialabel' },
      { value: AppResultsViewType.list, icon: 'icon-grid-8', ariaLabel: 'view-list--arialabel' },
    ];
  }

  onViewModeChange(newViewMode: AppResultsViewType) {
    const updatedSettings: Settings = {
      ...this.settings,
      searchResultsView: newViewMode
    };
    this.settingsChange.emit(updatedSettings);
  }

  onPageSizeChange(newPageSize: number) {
    if (!this.settings.displayConfig) {
      this.settings.displayConfig = this.displayConfigService.getConfigForSettings();
    }

    const updatedSettings: Settings = {
      ...this.settings,
      displayConfig: {
        ...this.settings.displayConfig,
        defaultPageSize: newPageSize
      }
    };
    this.settingsChange.emit(updatedSettings);
  }

  get currentPageSize(): number {
    return this.settings.displayConfig?.defaultPageSize || 60;
  }

  pageSizeDisplayFn = (size: number | null): string => {
    return size != null ? String(size) : '-';
  };

  loadTableColumns() {
    // If displayConfig exists in settings, use it; otherwise use service defaults
    if (this.settings.displayConfig) {
      this.tableColumns = this.settings.displayConfig.tableColumns.sort((a, b) => a.order - b.order);
    } else {
      this.tableColumns = this.displayConfigService.getAllColumns();
    }
  }

  loadFacetFilters() {
    // If displayConfig exists in settings and has facetFilters, use them; otherwise use service defaults
    if (this.settings.displayConfig && this.settings.displayConfig.facetFilters) {
      this.facetFilters = this.settings.displayConfig.facetFilters.sort((a, b) => a.order - b.order);
    } else {
      this.facetFilters = this.displayConfigService.getAllFacetFilters();
    }
  }

  onThemeChange(newTheme: AppSettingsThemeEnum) {
    this.settings.theme = newTheme;
    // Theme changes apply immediately (user wants to see the change in UI)
    this.settingsService.settings = this.settings;
  }

  onColumnVisibilityChange(columnId: string, visible: boolean) {
    // Update local settings copy only - will be saved when user clicks Save button
    if (!this.settings.displayConfig) {
      this.settings.displayConfig = this.displayConfigService.getConfigForSettings();
    }

    // Create a new settings object with the updated column
    const updatedSettings: Settings = {
      ...this.settings,
      displayConfig: {
        tableColumns: this.settings.displayConfig.tableColumns.map(col =>
          col.id === columnId ? { ...col, visible } : { ...col }
        ),
        facetFilters: this.settings.displayConfig.facetFilters?.map(f => ({ ...f }))
      }
    };

    this.settingsChange.emit(updatedSettings);
  }

  get allColumnsSelected(): boolean {
    return this.tableColumns.length > 0 && this.tableColumns.every(col => col.visible);
  }

  toggleAllColumns(selectAll: boolean) {
    if (!this.settings.displayConfig) {
      this.settings.displayConfig = this.displayConfigService.getConfigForSettings();
    }

    const updatedSettings: Settings = {
      ...this.settings,
      displayConfig: {
        tableColumns: this.settings.displayConfig.tableColumns.map(col => ({ ...col, visible: selectAll })),
        facetFilters: this.settings.displayConfig.facetFilters?.map(f => ({ ...f }))
      }
    };

    this.settingsChange.emit(updatedSettings);
  }

  resetColumnsToDefaults() {
    // Reset to defaults in local settings only
    const updatedSettings: Settings = {
      ...this.settings,
      displayConfig: {
        tableColumns: [...this.displayConfigService.getAllColumns().map(col => ({
          ...col,
          visible: col.defaultVisible
        }))],
        facetFilters: this.settings.displayConfig?.facetFilters || this.displayConfigService.getAllFacetFilters()
      }
    };
    this.settingsChange.emit(updatedSettings);
  }

  clickedFilterItem(filter: FacetFilterConfig) {
    this.onFacetFilterVisibilityChange(filter.id, !filter.visible);
  }

  get allFacetsSelected(): boolean {
    return this.facetFilters.length > 0 && this.facetFilters.every(f => f.visible);
  }

  toggleAllFacets(selectAll: boolean) {
    if (!this.settings.displayConfig) {
      this.settings.displayConfig = this.displayConfigService.getConfigForSettings();
    }

    if (!this.settings.displayConfig.facetFilters) {
      this.settings.displayConfig.facetFilters = this.displayConfigService.getAllFacetFilters();
    }

    const updatedSettings: Settings = {
      ...this.settings,
      displayConfig: {
        tableColumns: this.settings.displayConfig.tableColumns.map(col => ({ ...col })),
        facetFilters: this.settings.displayConfig.facetFilters.map(f => ({ ...f, visible: selectAll }))
      }
    };

    this.settingsChange.emit(updatedSettings);
  }

  onFacetFilterVisibilityChange(filterId: string, visible: boolean) {
    // Update local settings copy only - will be saved when user clicks Save button
    if (!this.settings.displayConfig) {
      this.settings.displayConfig = this.displayConfigService.getConfigForSettings();
    }

    if (!this.settings.displayConfig.facetFilters) {
      this.settings.displayConfig.facetFilters = this.displayConfigService.getAllFacetFilters();
    }

    const updatedSettings: Settings = {
      ...this.settings,
      displayConfig: {
        tableColumns: this.settings.displayConfig.tableColumns.map(col => ({ ...col })),
        facetFilters: this.settings.displayConfig.facetFilters.map(f =>
          f.id === filterId ? { ...f, visible } : { ...f }
        )
      }
    };

    this.settingsChange.emit(updatedSettings);
  }

  onFacetFilterDrop(event: CdkDragDrop<FacetFilterConfig[]>) {
    // Update local settings copy only - will be saved when user clicks Save button
    if (!this.settings.displayConfig) {
      this.settings.displayConfig = this.displayConfigService.getConfigForSettings();
    }

    if (!this.settings.displayConfig.facetFilters) {
      this.settings.displayConfig.facetFilters = this.displayConfigService.getAllFacetFilters();
    }

    const reorderedFilters = [...this.settings.displayConfig.facetFilters.map(f => ({ ...f }))];

    // Move the item in the array
    moveItemInArray(reorderedFilters, event.previousIndex, event.currentIndex);

    // Update the order property for all filters
    reorderedFilters.forEach((filter, index) => {
      filter.order = index;
    });

    const updatedSettings: Settings = {
      ...this.settings,
      displayConfig: {
        tableColumns: this.settings.displayConfig.tableColumns.map(col => ({ ...col })),
        facetFilters: reorderedFilters
      }
    };

    this.settingsChange.emit(updatedSettings);
  }

  resetFacetFiltersToDefaults() {
    // Reset to defaults in local settings only
    const updatedSettings: Settings = {
      ...this.settings,
      displayConfig: {
        tableColumns: this.settings.displayConfig?.tableColumns || this.displayConfigService.getAllColumns(),
        facetFilters: [...this.displayConfigService.getAllFacetFilters().map(filter => ({
          ...filter,
          visible: filter.defaultVisible
        }))]
      }
    };
    this.settingsChange.emit(updatedSettings);
  }

  protected readonly AppResultsViewType = AppResultsViewType;
}
