import { Component, inject, Input, Output, EventEmitter } from '@angular/core';
import { NgIf } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { AdminModeService } from '../../services';
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

  public adminModeService = inject(AdminModeService);
  private adminActionsService = inject(AdminActionsService);

  @Output() exportRequested = new EventEmitter<string[]>();
  @Output() editRequested = new EventEmitter<string[]>();

  onSelectAll(): void {
    this.adminModeService.selectAllVisible();
  }

  onDeselectAll(): void {
    this.adminModeService.deselectAllVisible();
  }

  onToggleAllVisible(): void {
    this.adminModeService.toggleAllVisible();
  }

  onExportSelected(): void {
    const selectedIds = this.adminModeService.getSelectedIds();
    this.exportRequested.emit(selectedIds);
    this.adminActionsService.performExportAction(selectedIds);
  }

  onEditSelected(): void {
    const selectedIds = this.adminModeService.getSelectedIds();
    this.editRequested.emit(selectedIds);
    this.adminActionsService.performEditAction(selectedIds);
  }
}
