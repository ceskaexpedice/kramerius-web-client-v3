import {Component, EventEmitter, Input, Output, inject} from '@angular/core';
import {SelectComponent} from '../../../../shared/components/select/select.component';
import {TranslatePipe} from '@ngx-translate/core';
import {MenuComponent, MenuItem} from '../../../../shared/components/menu/menu.component';
import {CdkTooltipDirective} from '../../../../shared/directives';
import {SolrSortDirections, SolrSortFields} from '../../../../core/solr/solr-helpers';
import {BreakpointService} from '../../../../shared/services/breakpoint.service';

interface SortOption {
  label: string;
  value: SolrSortFields;
  direction: SolrSortDirections;
}

interface SortChangeEvent {
  value: SolrSortFields;
  direction: SolrSortDirections;
}

@Component({
  selector: 'app-results-sort',
  imports: [
    SelectComponent,
    TranslatePipe,
    MenuComponent,
    CdkTooltipDirective,
  ],
  templateUrl: './results-sort.component.html',
  styleUrl: './results-sort.component.scss'
})
export class ResultsSortComponent {

  @Input() selectedSort: SolrSortFields = SolrSortFields.relevance;
  @Input() selectedDirection: SolrSortDirections = SolrSortDirections.desc;
  /** Compact toolbars: an icon button opening a menu instead of the wide select. Always on phones. */
  @Input() compact = false;
  @Output() sortChange: EventEmitter<SortChangeEvent> = new EventEmitter<SortChangeEvent>();

  sortOptions: SortOption[] = [
    { label: 'sort-newest-added', value: SolrSortFields.createdAt, direction: SolrSortDirections.desc },
    { label: 'sort-relevance', value: SolrSortFields.relevance, direction: SolrSortDirections.desc },
    { label: 'sort-alphabetical', value: SolrSortFields.title, direction: SolrSortDirections.asc },
    { label: 'sort-date-newest', value: SolrSortFields.dateMax, direction: SolrSortDirections.desc },
    { label: 'sort-date-oldest', value: SolrSortFields.dateMin, direction: SolrSortDirections.asc },
  ]

  get selectedSortOption(): SortOption {
    return this.sortOptions.find(option =>
      option.value === this.selectedSort && option.direction === this.selectedDirection
    ) || this.sortOptions[0];
  }

  onSortChange(event: SortOption) {
    this.sortChange.emit({
      value: event.value,
      direction: event.direction
    });
  }

  sortOptionDisplayFn = (option: any) => option ? option.label : '';

  private breakpointService = inject(BreakpointService);

  get isCompact(): boolean {
    return this.compact || this.breakpointService.isMobile();
  }

  /** Menu items for the compact mode; the active sort carries a tick. */
  get menuItems(): MenuItem[] {
    const selected = this.selectedSortOption;
    return this.sortOptions.map(option => ({
      id: `${option.value}|${option.direction}`,
      label: option.label,
      icon: option === selected ? 'tick-circle' : 'blank',
    }));
  }

  onMenuSelect(item: MenuItem) {
    const option = this.sortOptions.find(o => `${o.value}|${o.direction}` === item.id);
    if (option) {
      this.onSortChange(option);
    }
  }

}
