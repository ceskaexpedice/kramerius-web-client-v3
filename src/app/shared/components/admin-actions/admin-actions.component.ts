import { Component, inject, Input, Output, EventEmitter } from '@angular/core';
import { NgIf } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { SelectionService, AdminModeService } from '../../services';
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
  @Input() compact: boolean = false;
  
  public selectionService = inject(SelectionService);
  public adminModeService = inject(AdminModeService);
  private adminActionsService = inject(AdminActionsService);

  @Output() exportRequested = new EventEmitter<string[]>();
  @Output() editRequested = new EventEmitter<string[]>();

  onSelectAll(): void {
    this.selectionService.selectAllVisible();
  }

  onDeselectAll(): void {
    this.selectionService.deselectAllVisible();
  }

  onToggleAllVisible(): void {
    this.selectionService.toggleAllVisible();
  }

  onExportSelected(): void {
    const selectedIds = this.selectionService.getSelectedIds();
    
    // Emit event for parent components that may need to know
    this.exportRequested.emit(selectedIds);
    
    // Use the service to handle the export action
    this.adminActionsService.performExportAction(selectedIds);
  }

  onEditSelected(): void {
    const selectedIds = this.selectionService.getSelectedIds();
    
    // Emit event for parent components that may need to know
    this.editRequested.emit(selectedIds);
    
    // Use the service to handle the edit action
    this.adminActionsService.performEditAction(selectedIds);
  }
}