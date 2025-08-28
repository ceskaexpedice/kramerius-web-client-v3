import {Component, EventEmitter, inject, Output} from '@angular/core';
import {TranslatePipe} from '@ngx-translate/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';

@Component({
  selector: 'app-login-prompt-dialog',
  imports: [
    TranslatePipe,
  ],
  templateUrl: './login-prompt-dialog.component.html',
  styleUrls: ['./login-prompt-dialog.component.scss', '../generic-dialog.scss'],
})
export class LoginPromptDialogComponent {
  
  @Output() close = new EventEmitter<void>();
  @Output() login = new EventEmitter<void>();

  private dialogRef = inject(MatDialogRef<LoginPromptDialogComponent>, { optional: true });
  data = inject<any>(MAT_DIALOG_DATA);

  onClose() {
    this.close.emit();
    this.dialogRef?.close('cancel');
  }

  onLogin() {
    this.login.emit();
    this.dialogRef?.close('login');
  }
}