import { Component, inject, Input, OnInit } from '@angular/core';
import { AppSettingsThemeEnum, Settings } from '../../settings.model';
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
  ],
  templateUrl: './settings-display-section.component.html',
  styleUrl: './settings-display-section.component.scss'
})
export class SettingsDisplaySectionComponent implements OnInit {
  @Input() settings!: Settings;

  options: ToggleOption<AppSettingsThemeEnum>[] = [];
  tableColumns: TableColumnConfig[] = [];
  facetFilters: FacetFilterConfig[] = [];

  private settingsService = inject(SettingsService);
  private displayConfigService = inject(DisplayConfigService);

  ngOnInit() {
    this.generateToggleButtons();
    this.loadTableColumns();
    this.loadFacetFilters();
  }

  generateToggleButtons() {
    this.options = [
      { label: 'display-light-mode', value: AppSettingsThemeEnum.LIGHT, icon: 'icon-sun-1', iconColor: '--icon-sun-color' },
      { label: 'display-dark-mode', value: AppSettingsThemeEnum.DARK, icon: 'icon-moon', iconColor: '--icon-moon-color' },
      { label: 'display-system-mode', value: AppSettingsThemeEnum.SYSTEM, icon: 'icon-monitor' },
    ];
  }

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

    const column = this.settings.displayConfig.tableColumns.find(col => col.id === columnId);
    if (column) {
      column.visible = visible;
      // Refresh the local display
      this.loadTableColumns();
    }
  }

  resetColumnsToDefaults() {
    // Reset to defaults in local settings only
    this.settings.displayConfig = {
      tableColumns: [...this.displayConfigService.getAllColumns().map(col => ({
        ...col,
        visible: col.defaultVisible
      }))],
      facetFilters: this.settings.displayConfig?.facetFilters || this.displayConfigService.getAllFacetFilters()
    };
    this.loadTableColumns();
  }

  clickedFilterItem(filter: FacetFilterConfig) {
    this.onFacetFilterVisibilityChange(filter.id, !filter.visible);
  }

  onFacetFilterVisibilityChange(filterId: string, visible: boolean) {
    // Update local settings copy only - will be saved when user clicks Save button
    if (!this.settings.displayConfig) {
      this.settings.displayConfig = this.displayConfigService.getConfigForSettings();
    }

    if (!this.settings.displayConfig.facetFilters) {
      this.settings.displayConfig.facetFilters = this.displayConfigService.getAllFacetFilters();
    }

    const filter = this.settings.displayConfig.facetFilters.find(f => f.id === filterId);
    if (filter) {
      filter.visible = visible;
      // Refresh the local display
      this.loadFacetFilters();
    }
  }

  onFacetFilterDrop(event: CdkDragDrop<FacetFilterConfig[]>) {
    // Update local settings copy only - will be saved when user clicks Save button
    if (!this.settings.displayConfig) {
      this.settings.displayConfig = this.displayConfigService.getConfigForSettings();
    }

    if (!this.settings.displayConfig.facetFilters) {
      this.settings.displayConfig.facetFilters = this.displayConfigService.getAllFacetFilters();
    }

    // Move the item in the array
    moveItemInArray(this.facetFilters, event.previousIndex, event.currentIndex);

    // Update the order property for all filters
    this.facetFilters.forEach((filter, index) => {
      filter.order = index;
    });

    // Update the settings
    this.settings.displayConfig.facetFilters = [...this.facetFilters];
  }

  resetFacetFiltersToDefaults() {
    // Reset to defaults in local settings only
    this.settings.displayConfig = {
      tableColumns: this.settings.displayConfig?.tableColumns || this.displayConfigService.getAllColumns(),
      facetFilters: [...this.displayConfigService.getAllFacetFilters().map(filter => ({
        ...filter,
        visible: filter.defaultVisible
      }))]
    };
    this.loadFacetFilters();
  }

}
