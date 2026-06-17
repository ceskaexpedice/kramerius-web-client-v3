import { Component, computed, inject, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { NgIf } from '@angular/common';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { CdkTooltipDirective } from '../../directives/cdk-tooltip/cdk-tooltip.directive';
import { InputComponent } from '../../components/input/input.component';
import { EnvironmentService } from '../../services/environment.service';
import { UserService } from '../../services/user.service';
import { HttpClient } from '@angular/common/http';
import { ConfigService } from '../../../core/config/config.service';

export type EmailExportType = 'pdf' | 'epub' | 'txt';

export interface EmailExportDialogData {
  pid: string;
  exportType?: EmailExportType;
}

interface EmailExportOption {
  /** Translation key for the toggle label. */
  label: string;
  /** API request body field controlled by this toggle. */
  param: string;
  /** Export types this option is shown for. */
  types: EmailExportType[];
  /** Optional translation key for an info tooltip shown next to the label. */
  tooltip?: string;
  /** When true, the option is only shown if the `export.enrichWithAI` config flag is enabled. */
  requiresEnrichWithAI?: boolean;
}

const EMAIL_EXPORT_OPTIONS: EmailExportOption[] = [
  { label: 'email-export-dialog--option-enrich-llm', param: 'enrich_with_llm', types: ['epub', 'txt'], tooltip: 'email-export-dialog--option-enrich-llm-tooltip', requiresEnrichWithAI: true },
  { label: 'email-export-dialog--option-include-images', param: 'include_images', types: ['epub'] },
  { label: 'email-export-dialog--option-skip-page-numbers', param: 'skip_page_numbers', types: ['epub', 'txt'] },
];

@Component({
  selector: 'app-email-export-dialog',
  imports: [
    TranslatePipe,
    FormsModule,
    NgIf,
    MatSlideToggleModule,
    CdkTooltipDirective,
    InputComponent,
  ],
  templateUrl: './email-export-dialog.component.html',
  styleUrls: ['../generic-dialog.scss', './email-export-dialog.component.scss'],
})
export class EmailExportDialogComponent {

  email = '';
  loading = signal(false);
  emailInvalid = signal(false);

  /** Toggle state keyed by API param name. */
  optionValues = signal<Record<string, boolean>>({});

  private dialogRef = inject(MatDialogRef<EmailExportDialogComponent>);
  data = inject<EmailExportDialogData>(MAT_DIALOG_DATA);

  private environmentService = inject(EnvironmentService);
  private userService = inject(UserService);
  private http = inject(HttpClient);
  private configService = inject(ConfigService);

  /** Options relevant to the current export type and enabled by config. */
  options = computed<EmailExportOption[]>(() =>
    EMAIL_EXPORT_OPTIONS.filter(o =>
      o.types.includes(this.data.exportType ?? 'pdf') &&
      (!o.requiresEnrichWithAI || this.configService.isEnrichWithAIEnabled())
    )
  );

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

    this.http.post(url, this.buildBody()).subscribe({
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

  onOptionChange(param: string, checked: boolean): void {
    this.optionValues.update(values => ({ ...values, [param]: checked }));
  }

  private buildBody(): Record<string, unknown> {
    const body: Record<string, unknown> = { email: this.email };
    const values = this.optionValues();
    for (const option of this.options()) {
      body[option.param] = !!values[option.param];
    }
    return body;
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
