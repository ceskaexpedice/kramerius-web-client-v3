import {Component, EventEmitter, inject, Output} from '@angular/core';
import {TranslatePipe} from '@ngx-translate/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';

@Component({
  selector: 'app-delete-item-dialog',
  imports: [
    TranslatePipe,
  ],
  templateUrl: './delete-item-dialog.component.html',
  styleUrls: ['./delete-item-dialog.component.scss', '../generic-dialog.scss'],
})
export class DeleteItemDialogComponent {
  
  @Output() close = new EventEmitter<void>();
  @Output() delete = new EventEmitter<void>();

  private dialogRef = inject(MatDialogRef<DeleteItemDialogComponent>, { optional: true });
  data = inject<any>(MAT_DIALOG_DATA);

  get title(): string {
    return this.data?.title || 'delete-item-title';
  }

  get message(): string {
    return this.data?.message || 'delete-item-message';
  }

  get titleParams(): any {
    return this.data?.titleParams || {};
  }

  get messageParams(): any {
    return this.data?.messageParams || {};
  }

  onClose() {
    this.close.emit();
    this.dialogRef?.close('cancel');
  }

  onDelete() {
    this.delete.emit();
    this.dialogRef?.close('delete');
  }
}