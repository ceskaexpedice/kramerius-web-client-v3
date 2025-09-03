import {Component, inject, OnInit, OnDestroy} from '@angular/core';
import {ViewMode} from './models/view-mode.enum';
import {RecordInfoService} from '../../shared/services/record-info.service';
import {PeriodicalService} from '../../shared/services/periodical.service';
import {RecordHandlerService} from '../../shared/services/record-handler.service';
import {SolrSortDirections, SolrSortFields} from '../../core/solr/solr-helpers';
import {AdminSelectionService} from '../../shared/services/admin-selection.service';
import {AdminActionsService} from '../../shared/services/admin-actions.service';
import {Subscription} from 'rxjs';
import {DocumentTypeEnum} from '../constants/document-type';
import {DocumentAccessibilityEnum} from '../constants/document-accessibility';

@Component({
  selector: 'app-periodical-view-page',
  standalone: false,
  templateUrl: './periodical-page.component.html',
  styleUrl: './periodical-page.component.scss'
})
export class PeriodicalPageComponent implements OnInit, OnDestroy {
  public periodical = inject(PeriodicalService);
  public recordInfoService = inject(RecordInfoService);
  public recordHandler = inject(RecordHandlerService);
  public adminSelectionService = inject(AdminSelectionService);
  private adminActionsService = inject(AdminActionsService);

  private subscriptions: Subscription[] = [];

  protected readonly ViewMode = ViewMode;

  constructor() {
    //this.periodical.watchRouteParams();
  }

  ngOnInit(): void {
    // Set up admin selection service to track current page items for search results
    this.subscriptions.push(
      this.periodical.searchResults$.subscribe(searchResults => {
        if (searchResults && this.periodical.viewMode() === ViewMode.SearchResults) {
          this.adminSelectionService.updateCurrentPageItems(searchResults);
        }
      })
    );

    // track available years for years grid view
    this.subscriptions.push(
      this.periodical.availableYears$.subscribe(years => {
        if (years && this.periodical.viewMode() !== ViewMode.SearchResults) {
          // Convert PeriodicalItemYear[] to SearchDocument format that AdminSelectionService expects
          const yearItems = years.map(year => ({
            pid: year.pid,
            title: year.year,
            model: year.model as DocumentTypeEnum,
            accessibility: year.accessibility,
            licenses: year.licenses,
            access: 'public' // Default access for periodical years
          }));
          this.adminSelectionService.updateCurrentPageItems(yearItems);
        }
      })
    );

    // Track periodical children (issues) for year-issues-grid view
    this.subscriptions.push(
      this.periodical.periodicalChildren$.subscribe(children => {
        if (children && children.length > 0 && this.periodical.viewMode() !== ViewMode.SearchResults) {
          // Convert PeriodicalItemChild[] to SearchDocument format that AdminSelectionService expects
          const childrenItems = children.map(child => ({
            pid: child.pid,
            title: child['date.str'] || `${child['date_range_end.day']}.${child['date_range_end.month']}`,
            model: child.model as DocumentTypeEnum,
            accessibility: child.licenses?.length ? DocumentAccessibilityEnum.PRIVATE : DocumentAccessibilityEnum.PUBLIC,
            licenses: child['licenses.facet'] || child.licenses || [],
            access: 'public' // Default access for periodical children
          }));
          this.adminSelectionService.updateCurrentPageItems(childrenItems);
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  openRecordInfo() {
    // get uuid from document
    if (!this.periodical.uuid) return;
    this.recordInfoService.openRecordInfoDialog(this.periodical.uuid);
  }

  onSortChange(event: { value: SolrSortFields; direction: SolrSortDirections }) {
    this.periodical.changeSortBy(event.value, event.direction);
  }

  toggleAdminMode(): void {
    this.adminSelectionService.toggleAdminMode();
  }

  // Admin action methods (delegated from admin-actions component)
  onExportSelected(): void {
    // Use the AdminActionsService to handle export
    this.adminActionsService.performExportAction();
  }

  onEditSelected(selectedIds: string[]): void {
    console.log('Edit selected items in periodical:', selectedIds);
    // Use the AdminActionsService to handle edit
    this.adminActionsService.performEditAction(selectedIds);
  }

}
