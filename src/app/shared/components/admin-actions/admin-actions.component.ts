import { Component, inject, Output, EventEmitter } from '@angular/core';
import { NgIf } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { AdminSelectionService } from '../../services/admin-selection.service';
import { ExportService, ExportFormat } from '../../services/export.service';

@Component({
  selector: 'app-admin-actions',
  standalone: true,
  imports: [
    NgIf,
    TranslatePipe,
  ],
  templateUrl: './admin-actions.component.html',
  styleUrl: './admin-actions.component.scss'
})
export class AdminActionsComponent {
  adminSelectionService = inject(AdminSelectionService);
  private exportService = inject(ExportService);

  @Output() exportRequested = new EventEmitter<string[]>();
  @Output() editRequested = new EventEmitter<string[]>();

  onSelectAll(): void {
    this.adminSelectionService.selectAllVisible();
  }

  onDeselectAll(): void {
    this.adminSelectionService.deselectAllVisible();
  }

  onToggleAllVisible(): void {
    this.adminSelectionService.toggleAllVisible();
  }

  onExportSelected(): void {
    const selectedIds = this.adminSelectionService.getSelectedIds();
    if (selectedIds.length === 0) return;

    // Emit event for parent component to handle, but also provide default implementation
    this.exportRequested.emit(selectedIds);

    // Default export implementation if parent doesn't handle it
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

  onEditSelected(): void {
    const selectedIds = this.adminSelectionService.getSelectedIds();
    if (selectedIds.length === 0) return;

    // Emit event for parent component to handle
    this.editRequested.emit(selectedIds);
  }
}