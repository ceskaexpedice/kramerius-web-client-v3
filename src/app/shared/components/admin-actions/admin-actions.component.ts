import { Component, inject, Output, EventEmitter } from '@angular/core';
import { NgIf } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { AdminSelectionService } from '../../services/admin-selection.service';
import { AdminActionsService } from '../../services/admin-actions.service';

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
  private adminActionsService = inject(AdminActionsService);

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
    
    // Emit event for parent components that may need to know
    this.exportRequested.emit(selectedIds);
    
    // Use the service to handle the export action
    this.adminActionsService.performExportAction(selectedIds);
  }

  onEditSelected(): void {
    const selectedIds = this.adminSelectionService.getSelectedIds();
    
    // Emit event for parent components that may need to know
    this.editRequested.emit(selectedIds);
    
    // Use the service to handle the edit action
    this.adminActionsService.performEditAction(selectedIds);
  }
}