import {Component, EventEmitter, inject, Output} from '@angular/core';
import {NgForOf, NgIf} from '@angular/common';
import {TranslatePipe, TranslateService} from '@ngx-translate/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {TabsComponent} from '../../components/tabs/tabs.component';
import {TabItemComponent} from '../../components/tabs/tab-item.component';
import {CitationResponse, CitationService} from '../../services/citation.service';
import {EnvironmentService} from '../../services/environment.service';

export type CitationType = 'latex' | 'html' | 'text' | 'bibtex' | 'wiki';

@Component({
  selector: 'app-citation-dialog',
  imports: [
    NgForOf,
    NgIf,
    TranslatePipe,
    TabsComponent,
    TabItemComponent,
  ],
  templateUrl: './citation-dialog.component.html',
  styleUrl: './citation-dialog.component.scss'
})
export class CitationDialogComponent {
  selectedType = 'iso690';
  selectedFormat: 'txt' | 'html' = 'html';
  uuid!: string;

  isLoading = false;
  error: string | null = null;
  citationResponse: CitationResponse | null = null;

  @Output() close = new EventEmitter<void>();

  private dialogRef = inject(MatDialogRef<CitationDialogComponent>, { optional: true });
  data = inject<any>(MAT_DIALOG_DATA);

  private citationService = inject(CitationService);
  private translationService = inject(TranslateService);
  private environmentService = inject(EnvironmentService);

  constructor() {
    console.log('data in citation dialog:', this.data);
    this.uuid = this.data.uuid;
    this.loadCitation();
  }

  changeType(type: CitationType): void {
    this.selectedType = type;
    this.selectedFormat = type === 'latex' || type === 'bibtex' ? 'txt' : 'html';
    //this.loadCitation();
  }

  onClose() {
    this.close.emit();
    this.dialogRef?.close();
  }

  loadCitation(): void {
    this.isLoading = true;
    this.error = null;
    this.citationResponse = null;

    const lang = this.translationService.currentLang;
    const apiUrl = this.environmentService.getBaseApiUrl();
    // refurl is current url
    const refUrl = window.location.href;

    this.citationService.getCitation({
      url: apiUrl,
      uuid: this.uuid,
      exp: 'all',
      format: this.selectedFormat,
      lang: lang,
      ref: refUrl
    }).subscribe({
      next: (result) => {
        this.citationResponse = result;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Nepodařilo se načíst citaci:', err);
        this.error = 'Nepodařilo se načíst citaci.';
        this.isLoading = false;
      }
    });
  }
}
