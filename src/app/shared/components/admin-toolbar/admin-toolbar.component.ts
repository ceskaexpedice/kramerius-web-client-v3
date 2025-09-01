import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { NgIf } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { AdminSelectionService } from '../../services/admin-selection.service';
import { SearchService } from '../../services/search.service';
import { ExportService, ExportFormat } from '../../services/export.service';
import { SearchDocument } from '../../../modules/models/search-document';
import { Subscription, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-admin-toolbar',
  imports: [
    NgIf,
    TranslatePipe,
  ],
  templateUrl: './admin-toolbar.component.html',
  styleUrl: './admin-toolbar.component.scss'
})
export class AdminToolbarComponent implements OnInit, OnDestroy {
  adminSelectionService = inject(AdminSelectionService);
  searchService = inject(SearchService);
  exportService = inject(ExportService);

  private subscriptions: Subscription[] = [];

  ngOnInit(): void {
    // Combine both result streams and update current page items
    this.subscriptions.push(
      combineLatest([
        this.searchService.nonPageResults$,
        this.searchService.pageResults$
      ]).pipe(
        map(([nonPageResults, pageResults]) => {
          const allResults: SearchDocument[] = [];
          if (nonPageResults) allResults.push(...nonPageResults);
          if (pageResults) allResults.push(...pageResults);
          return allResults;
        })
      ).subscribe(allCurrentItems => {
        this.adminSelectionService.updateCurrentPageItems(allCurrentItems);
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  onSelectAllVisible(): void {
    this.adminSelectionService.selectAllVisible();
  }

  onDeselectAllVisible(): void {
    this.adminSelectionService.deselectAllVisible();
  }

  onToggleAllVisible(): void {
    this.adminSelectionService.toggleAllVisible();
  }

  onClearSelection(): void {
    this.adminSelectionService.clearSelection();
  }

  onExportSelected(): void {
    const selectedIds = this.adminSelectionService.getSelectedIds();
    if (selectedIds.length === 0) return;

    // For now, export as JSON. In the future, we could show a format selection dialog
    this.exportService.exportSelectedItems(selectedIds, {
      format: ExportFormat.JSON,
      includeMetadata: true
    }).subscribe({
      next: () => {
        console.log(`Successfully exported ${selectedIds.length} items`);
      },
      error: (error) => {
        console.error('Export failed:', error);
      }
    });
  }

  onDeleteSelected(): void {
    const selectedIds = this.adminSelectionService.getSelectedIds();
    console.log('Delete selected items:', selectedIds);
    // TODO: Implement delete functionality
  }

  onBulkAddToFavorites(): void {
    const selectedIds = this.adminSelectionService.getSelectedIds();
    console.log('Add to favorites:', selectedIds);
    // TODO: Implement bulk add to favorites
  }
}