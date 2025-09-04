import { Injectable, inject } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { Observable, from } from 'rxjs';
import { AdminSelectionService } from './admin-selection.service';
import { ExportService, ExportFormat } from './export.service';
import { EditSelectedDialogComponent, EditSelectedDialogData } from '../dialogs/edit-selected-dialog/edit-selected-dialog.component';
import { ExportSelectedDialogComponent, ExportSelectedDialogData } from '../dialogs/export-selected-dialog/export-selected-dialog.component';

export interface AdminActionResult {
  action: 'save' | 'export' | 'admin' | 'cancel';
  data?: any;
  selectedIds?: string[];
}

@Injectable({
  providedIn: 'root'
})
export class AdminActionsService {

  private dialog = inject(MatDialog);
  private adminSelectionService = inject(AdminSelectionService);
  private exportService = inject(ExportService);

  /**
   * Opens the edit selected dialog for bulk editing operations
   * @param selectedIds Optional array of specific IDs to edit, defaults to current selection
   * @returns Observable that emits when dialog is closed with result
   */
  openEditDialog(selectedIds?: string[]): Observable<AdminActionResult | undefined> {
    const ids = selectedIds || this.adminSelectionService.getSelectedIds();

    if (ids.length === 0) {
      console.warn('No items selected for editing');
      return from([undefined]);
    }

    const dialogData: EditSelectedDialogData = {
      selectedIds: ids,
      selectedCount: ids.length
    };

    const dialogRef: MatDialogRef<EditSelectedDialogComponent> = this.dialog.open(EditSelectedDialogComponent, {
      width: '80vw',
      maxWidth: '1000px',
      height: '80vh',
      data: dialogData,
      disableClose: false
    });

    return dialogRef.afterClosed();
  }

  /**
   * Opens the export selected dialog for bulk export operations
   * @param selectedIds Optional array of specific IDs to export, defaults to current selection
   * @returns Observable that emits when dialog is closed with result
   */
  openExportDialog(selectedIds?: string[]): Observable<AdminActionResult | undefined> {
    const ids = selectedIds || this.adminSelectionService.getSelectedIds();

    if (ids.length === 0) {
      console.warn('No items selected for export');
      return from([undefined]);
    }

    const dialogData: ExportSelectedDialogData = {
      selectedIds: ids,
      selectedCount: ids.length
    };

    const dialogRef: MatDialogRef<ExportSelectedDialogComponent> = this.dialog.open(ExportSelectedDialogComponent, {
      width: '80vw',
      maxWidth: '1000px',
      height: '80vh',
      data: dialogData,
      disableClose: false
    });

    return dialogRef.afterClosed();
  }

  /**
   * Handles edit operations based on dialog result
   * @param result Result from edit dialog
   */
  handleEditResult(result: any): void {
    if (!result || result.action !== 'save') return;

    console.log('Processing edit operation:', result);

    switch (result.section) {
      case 'reindex':
        this.handleReindexOperation(result);
        break;
      case 'collections':
        this.handleCollectionOperation(result);
        break;
      case 'licence':
        this.handleLicenceOperation(result);
        break;
      default:
        console.warn('Unknown edit section:', result.section);
    }
  }

  /**
   * Handles export operations based on dialog result
   * @param result Result from export dialog
   */
  handleExportResult(result: any): void {
    if (!result || result.action !== 'export') return;

    console.log('Processing export operation:', result);

    const exportOptions = {
      format: this.mapExportFormat(result.format),
      includeMetadata: result.options?.includeMetadata || false,
      csvOptions: result.options,
      ...result.options
    };

    this.exportService.exportSelectedItems(result.selectedIds, exportOptions).subscribe({
      next: () => {
        console.log(`Successfully exported ${result.selectedIds.length} items as ${result.format}`);
        // TODO: Show success notification
      },
      error: (error) => {
        console.error('Export failed:', error);
        // TODO: Show error notification
      }
    });
  }

  /**
   * Handles navigation to admin interface
   * @param selectedIds Array of selected item IDs
   */
  handleAdminNavigation(selectedIds: string[]): void {
    console.log('Navigating to admin interface with items:', selectedIds);
    // TODO: Implement navigation to admin interface
  }

  /**
   * Convenience method to perform edit action with dialog
   * @param selectedIds Optional specific IDs to edit
   */
  performEditAction(selectedIds?: string[]): void {
    this.openEditDialog(selectedIds).subscribe(result => {
      if (result?.action === 'save') {
        this.handleEditResult(result);
      } else if (result?.action === 'admin') {
        this.handleAdminNavigation(result.selectedIds || []);
      }
    });
  }

  /**
   * Convenience method to perform export action with dialog
   * @param selectedIds Optional specific IDs to export
   */
  performExportAction(selectedIds?: string[]): void {
    this.openExportDialog(selectedIds).subscribe(result => {
      if (result?.action === 'export') {
        this.handleExportResult(result);
      }
    });
  }

  private handleReindexOperation(result: any): void {
    console.log('Handling reindex operation:', result);
    // TODO: Implement reindex API call
  }

  private handleCollectionOperation(result: any): void {
    console.log('Handling collection operation:', result);
    // TODO: Implement collection API call
  }

  private handleLicenceOperation(result: any): void {
    console.log('Handling licence operation:', result);
    // TODO: Implement licence API call
  }

  private mapExportFormat(format: string): ExportFormat {
    switch (format) {
      case 'csv':
        return ExportFormat.CSV;
      case 'xml':
        return ExportFormat.XML;
      case 'dl4dh':
        return ExportFormat.JSON; // or create a new DL4DH format
      default:
        return ExportFormat.JSON;
    }
  }
}
