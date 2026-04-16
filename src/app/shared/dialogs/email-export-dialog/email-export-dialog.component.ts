import { Component, inject, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { NgIf } from '@angular/common';
import { InputComponent } from '../../components/input/input.component';
import { EnvironmentService } from '../../services/environment.service';
import { UserService } from '../../services/user.service';
import { HttpClient } from '@angular/common/http';

export type EmailExportType = 'pdf' | 'epub' | 'txt';

export interface EmailExportDialogData {
  pid: string;
  exportType?: EmailExportType;
}

@Component({
  selector: 'app-email-export-dialog',
  imports: [
    TranslatePipe,
    FormsModule,
    NgIf,
    InputComponent,
  ],
  templateUrl: './email-export-dialog.component.html',
  styleUrls: ['../generic-dialog.scss', './email-export-dialog.component.scss'],
})
export class EmailExportDialogComponent {

  email = '';
  loading = signal(false);
  emailInvalid = signal(false);

  private dialogRef = inject(MatDialogRef<EmailExportDialogComponent>);
  data = inject<EmailExportDialogData>(MAT_DIALOG_DATA);

  private environmentService = inject(EnvironmentService);
  private userService = inject(UserService);
  private http = inject(HttpClient);

  constructor() {
    this.email = this.userService.userSession$()?.email || '';
  }

  onClose(): void {
    this.dialogRef.close();
  }

  onSubmit(): void {
    if (!this.isValidEmail(this.email)) {
      this.emailInvalid.set(true);
      return;
    }

    this.emailInvalid.set(false);
    this.loading.set(true);

    const baseUrl = this.environmentService.getBaseApiUrl();
    const url = this.buildUrl(baseUrl);

    this.http.post(url, { email: this.email }).subscribe({
      next: () => {
        this.loading.set(false);
        this.dialogRef.close('submitted');
      },
      error: () => {
        this.loading.set(false);
        this.dialogRef.close('error');
      }
    });
  }

  onEmailChange(value: string | number): void {
    this.email = String(value);
    if (this.emailInvalid()) {
      this.emailInvalid.set(false);
    }
  }

  private buildUrl(baseUrl: string): string {
    const pid = this.data.pid;
    switch (this.data.exportType) {
      case 'epub':
        return `${baseUrl}/search/api/client/v7.0/items/${pid}/requests/special_needs_ebook`;
      case 'txt':
        return `${baseUrl}/search/api/client/v7.0/items/${pid}/requests/special_needs_text`;
      case 'pdf':
      default:
        return `${baseUrl}/search/api/client/v7.0/items/${pid}/requests/generate_pdf`;
    }
  }

  private isValidEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  }
}
