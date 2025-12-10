import { Injectable, inject } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { Observable, from, forkJoin } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { SelectionService } from './selection.service';
import { ExportService, ExportFormat } from './export.service';
import { ToastService } from './toast.service';
import { UserService } from './user.service';
import { EditSelectedDialogComponent, EditSelectedDialogData, EditSelectedDialogSections } from '../dialogs/edit-selected-dialog/edit-selected-dialog.component';
import { ExportSelectedDialogComponent, ExportSelectedDialogData } from '../dialogs/export-selected-dialog/export-selected-dialog.component';
import { AdminReindexService } from '../../core/admin/admin-reindex.service';
import { AdminLicensesService } from '../../core/admin/admin-licenses.service';
import { AdminCollectionsService } from '../../core/admin/admin-collections.service';
import { ReindexSectionData } from '../dialogs/edit-selected-dialog/components/edit-reindex-section/edit-reindex-section.component';
import { AddLicenseSectionData } from '../dialogs/edit-selected-dialog/components/add-license-section/add-license-section.component';
import { RemoveLicenseSectionData } from '../dialogs/edit-selected-dialog/components/remove-license-section/remove-license-section.component';
import { AddCollectionSectionData } from '../dialogs/edit-selected-dialog/components/add-collection-section/add-collection-section.component';
import { RemoveCollectionSectionData } from '../dialogs/edit-selected-dialog/components/remove-collection-section/remove-collection-section.component';

export interface AdminActionResult {
  action: 'save' | 'export' | 'admin' | 'cancel';
  data?: any;
  selectedIds?: string[];
  section?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AdminActionsService {

  private dialog = inject(MatDialog);
  private selectionService = inject(SelectionService);
  private exportService = inject(ExportService);
  private toastService = inject(ToastService);
  private userService = inject(UserService);
  private reindexService = inject(AdminReindexService);
  private licensesService = inject(AdminLicensesService);
  private collectionsService = inject(AdminCollectionsService);

  /**
   * Check if current user has admin privileges
   * @returns true if user has kramerius_admin or k4_admins role
   */
  isUserAdmin(): boolean {
    return this.userService.hasAdminRole();
  }

  /**
   * Get observable of admin status (reactive)
   */
  get isUserAdmin$() {
    return this.userService.isAdmin$;
  }

  /**
   * Opens the edit selected dialog for bulk editing operations
   * Requires admin role (kramerius_admin or k4_admins)
   * @param selectedIds Optional array of specific IDs to edit, defaults to current selection
   * @returns Observable that emits when dialog is closed with result
   */
  openEditDialog(selectedIds?: string[]): Observable<AdminActionResult | undefined> {
    // Check if user has admin role
    if (!this.userService.hasAdminRole()) {
      console.warn('User does not have admin privileges to open edit dialog');
      this.toastService.show('admin-permission-required');
      return from([undefined]);
    }

    const ids = selectedIds || this.selectionService.getSelectedIds();

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
      height: '85vh',
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
    const ids = selectedIds || this.selectionService.getSelectedIds();

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
   * @returns Observable that completes when operation finishes
   */
  handleEditResult(result: AdminActionResult): Observable<any> {
    if (!result || !result.section) {
      return from([null]);
    }

    console.log('Processing edit operation:', result);

    switch (result.section) {
      case EditSelectedDialogSections.reindex:
        return this.handleReindexOperation(result.data);
      case EditSelectedDialogSections.addCollection:
        return this.handleAddCollectionOperation(result.data);
      case EditSelectedDialogSections.removeCollection:
        return this.handleRemoveCollectionOperation(result.data);
      case EditSelectedDialogSections.addLicence:
        return this.handleAddLicenseOperation(result.data);
      case EditSelectedDialogSections.removeLicence:
        return this.handleRemoveLicenseOperation(result.data);
      default:
        console.warn('Unknown edit section:', result.section);
        return from([null]);
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
        this.toastService.show('export-success', 'close', 5000);
      },
      error: (error) => {
        console.error('Export failed:', error);
        this.toastService.show('export-error', 'close', 5000);
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
      if (result && result.section) {
        console.log('Processing admin action...', result);

        this.handleEditResult(result).subscribe({
          next: (responses) => {
            console.log('Admin action completed successfully', responses);
            // Show success messages from API responses
            this.showSuccessMessages(responses, result.section);
          },
          error: (error) => {
            console.error('Admin action failed:', error);
            // Show error message
            const errorKey = this.getErrorMessageKey(result.section);
            this.toastService.show(errorKey);
          }
        });
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

  /**
   * Handle reindex operation
   * @param data Reindex section data
   */
  private handleReindexOperation(data: ReindexSectionData): Observable<any> {
    console.log('Handling reindex operation:', data);

    // Map scope to API type
    const type = data.scope === 'object-and-children' ? 'TREE_AND_FOSTER_TREES' : 'OBJECT';

    return this.reindexService.reindexBulk(data.selectedIds, type).pipe(
      tap(() => console.log(`Reindexed ${data.selectedIds.length} items with scope: ${type}`)),
      catchError(error => {
        console.error('Reindex operation failed:', error);
        throw error;
      })
    );
  }

  /**
   * Handle add collection operation
   * @param data Add collection section data
   */
  private handleAddCollectionOperation(data: AddCollectionSectionData): Observable<any> {
    console.log('Handling add collection operation:', data);

    if (!data.selectedCollections || data.selectedCollections.length === 0) {
      console.warn('No collections selected');
      return from([null]);
    }

    return this.collectionsService.addItemsToCollectionsBulk(
      data.selectedCollections,
      data.selectedIds
    ).pipe(
      tap(() => console.log(`Added ${data.selectedIds.length} items to ${data.selectedCollections.length} collections`)),
      catchError(error => {
        console.error('Add collection operation failed:', error);
        throw error;
      })
    );
  }

  /**
   * Handle remove collection operation
   * @param data Remove collection section data
   */
  private handleRemoveCollectionOperation(data: RemoveCollectionSectionData): Observable<any> {
    console.log('Handling remove collection operation:', data);

    if (!data.selectedCollections || data.selectedCollections.length === 0) {
      console.warn('No collections selected');
      return from([null]);
    }

    return this.collectionsService.removeItemsFromCollectionsBulk(
      data.selectedCollections,
      data.selectedIds
    ).pipe(
      tap(() => console.log(`Removed ${data.selectedIds.length} items from ${data.selectedCollections.length} collections`)),
      catchError(error => {
        console.error('Remove collection operation failed:', error);
        throw error;
      })
    );
  }

  /**
   * Handle add license operation
   * @param data Add license section data
   */
  private handleAddLicenseOperation(data: AddLicenseSectionData): Observable<any> {
    console.log('Handling add license operation:', data);

    if (!data.selectedLicenses || data.selectedLicenses.length === 0) {
      console.warn('No licenses selected');
      return from([null]);
    }

    // Add each selected license to all selected items
    const operations = data.selectedLicenses.map(licenseName =>
      this.licensesService.addLicenseBulk(data.selectedIds, licenseName)
    );

    return forkJoin(operations).pipe(
      tap(() => console.log(`Added ${data.selectedLicenses.length} licenses to ${data.selectedIds.length} items`)),
      catchError(error => {
        console.error('Add license operation failed:', error);
        throw error;
      })
    );
  }

  /**
   * Handle remove license operation
   * @param data Remove license section data
   */
  private handleRemoveLicenseOperation(data: RemoveLicenseSectionData): Observable<any> {
    console.log('Handling remove license operation:', data);

    if (!data.selectedLicenses || data.selectedLicenses.length === 0) {
      console.warn('No licenses selected');
      return from([null]);
    }

    // Remove each selected license from all selected items
    const operations = data.selectedLicenses.map(licenseName =>
      this.licensesService.removeLicenseBulk(data.selectedIds, licenseName)
    );

    return forkJoin(operations).pipe(
      tap(() => console.log(`Removed ${data.selectedLicenses.length} licenses from ${data.selectedIds.length} items`)),
      catchError(error => {
        console.error('Remove license operation failed:', error);
        throw error;
      })
    );
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

  /**
   * Show success messages from API responses
   * @param responses API responses (can be single or array)
   * @param section Section identifier for fallback message
   */
  private showSuccessMessages(responses: any, section?: string): void {
    if (!responses) {
      // Fallback to generic success message
      const successKey = this.getSuccessMessageKey(section);
      this.toastService.show(successKey);
      return;
    }

    // Handle array of responses (bulk operations)
    if (Array.isArray(responses)) {
      // For bulk operations, show the first response message or a summary
      if (responses.length > 0 && responses[0]?.name) {
        // Show first message with count if multiple
        const message = responses.length > 1
          ? `${responses[0].name} (+${responses.length - 1} more)`
          : responses[0].name;
        this.toastService.show(message);
      } else {
        // Fallback to generic message with count
        const successKey = this.getSuccessMessageKey(section);
        this.toastService.show(`${successKey} (${responses.length})`);
      }
    } else {
      // Single response
      if (responses.name) {
        this.toastService.show(responses.name);
      } else {
        // Fallback to generic success message
        const successKey = this.getSuccessMessageKey(section);
        this.toastService.show(successKey);
      }
    }
  }

  /**
   * Get success message translation key based on section
   * @param section Section identifier
   */
  private getSuccessMessageKey(section?: string): string {
    switch (section) {
      case EditSelectedDialogSections.reindex:
        return 'reindex-success';
      case EditSelectedDialogSections.addCollection:
        return 'add-collection-success';
      case EditSelectedDialogSections.removeCollection:
        return 'remove-collection-success';
      case EditSelectedDialogSections.addLicence:
        return 'add-license-success';
      case EditSelectedDialogSections.removeLicence:
        return 'remove-license-success';
      default:
        return 'action-success';
    }
  }

  /**
   * Get error message translation key based on section
   * @param section Section identifier
   */
  private getErrorMessageKey(section?: string): string {
    switch (section) {
      case EditSelectedDialogSections.reindex:
        return 'reindex-error';
      case EditSelectedDialogSections.addCollection:
        return 'add-collection-error';
      case EditSelectedDialogSections.removeCollection:
        return 'remove-collection-error';
      case EditSelectedDialogSections.addLicence:
        return 'add-license-error';
      case EditSelectedDialogSections.removeLicence:
        return 'remove-license-error';
      default:
        return 'action-error';
    }
  }
}
