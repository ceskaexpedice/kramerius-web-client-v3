import {Component, EventEmitter, inject, Output} from '@angular/core';
import {TranslatePipe} from '@ngx-translate/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {MatCheckbox} from '@angular/material/checkbox';
import {FormsModule} from '@angular/forms';
import {DontShowAgainService, DontShowDialogs} from '../../services/dont-show-again.service';

@Component({
  selector: 'app-login-prompt-dialog',
  imports: [
    TranslatePipe,
    MatCheckbox,
    FormsModule,
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
  data = inject<any>(MAT_DIALOG_DATA);

  constructor() {

  }

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
    if (this.dontShowAgain) {
      this.dontShowAgainService.setDontShowAgain(DontShowDialogs.FavoritesLoginDialog);
    }
  }
}
