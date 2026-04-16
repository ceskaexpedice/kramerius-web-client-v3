import {Component, EventEmitter, inject, Output} from '@angular/core';
import {TranslatePipe} from '@ngx-translate/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {MatCheckbox} from '@angular/material/checkbox';
import {FormsModule} from '@angular/forms';
import {NgIf} from '@angular/common';
import {DontShowAgainService, DontShowDialogs} from '../../services/dont-show-again.service';

export interface LoginPromptDialogData {
  titleKey?: string;
  messageKey?: string;
  dontShowDialogId?: DontShowDialogs;
}

@Component({
  selector: 'app-login-prompt-dialog',
  imports: [
    TranslatePipe,
    MatCheckbox,
    FormsModule,
    NgIf,
  ],
  templateUrl: './login-prompt-dialog.component.html',
  styleUrls: ['./login-prompt-dialog.component.scss', '../generic-dialog.scss'],
})
export class LoginPromptDialogComponent {

  dontShowAgain = false;

  @Output() close = new EventEmitter<void>();
  @Output() login = new EventEmitter<void>();

  private dontShowAgainService = inject(DontShowAgainService);
  private dialogRef = inject(MatDialogRef<LoginPromptDialogComponent>, { optional: true });
  data = inject<LoginPromptDialogData | null>(MAT_DIALOG_DATA, { optional: true });

  titleKey = this.data?.titleKey ?? 'login-required-favorites-title';
  messageKey = this.data?.messageKey ?? 'login-prompt-message-favorites';
  dontShowDialogId: DontShowDialogs | undefined = this.data?.dontShowDialogId;
  showDontShowAgain = this.dontShowDialogId !== undefined;

  onClose() {
    this.handleDialogResult();
    this.close.emit();
    this.dialogRef?.close('cancel');
  }

  onLogin() {
    this.handleDialogResult();
    this.login.emit();
    this.dialogRef?.close('login');
  }

  handleDialogResult() {
    if (this.dontShowAgain && this.dontShowDialogId) {
      this.dontShowAgainService.setDontShowAgain(this.dontShowDialogId);
    }
  }
}
