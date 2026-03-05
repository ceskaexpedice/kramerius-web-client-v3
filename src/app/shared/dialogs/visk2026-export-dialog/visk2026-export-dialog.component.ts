import { Component, inject, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { NgIf } from '@angular/common';
import { InputComponent } from '../../components/input/input.component';
import { EnvironmentService } from '../../services/environment.service';
import { HttpClient } from '@angular/common/http';

export interface Visk2026ExportDialogData {
  pid: string;
}

@Component({
  selector: 'app-visk2026-export-dialog',
  imports: [
    TranslatePipe,
    FormsModule,
    NgIf,
    InputComponent,
  ],
  templateUrl: './visk2026-export-dialog.component.html',
  styleUrls: ['../generic-dialog.scss', './visk2026-export-dialog.component.scss'],
})
export class Visk2026ExportDialogComponent {

  email = '';
  loading = signal(false);
  emailInvalid = signal(false);

  private dialogRef = inject(MatDialogRef<Visk2026ExportDialogComponent>);
  data = inject<Visk2026ExportDialogData>(MAT_DIALOG_DATA);

  private environmentService = inject(EnvironmentService);
  private http = inject(HttpClient);

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
    const url = `${baseUrl}/search/api/client/v7.0/items/${this.data.pid}/requests/generate_pdf`;

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

  private isValidEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  }
}
