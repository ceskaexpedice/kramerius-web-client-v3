import {Component, EventEmitter, inject, Output} from '@angular/core';
import {TranslatePipe, TranslateService} from '@ngx-translate/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {TabsComponent} from '../../components/tabs/tabs.component';
import {TabItemComponent} from '../../components/tabs/tab-item.component';
import {CitationResponse, CitationService} from '../../services/citation.service';
import {EnvironmentService} from '../../services/environment.service';
import {Metadata} from '../../models/metadata.model';
import {ButtonToggleComponent} from '../../components/button-toggle/button-toggle.component';
import {NgForOf} from '@angular/common';
import {RecordHandlerService} from '../../services/record-handler.service';
import {copyTextToClipboard} from '../../misc/misc-functions';

export type CitationType = 'latex' | 'html' | 'text' | 'bibtex' | 'wiki';

@Component({
  selector: 'app-citation-dialog',
  imports: [
    TranslatePipe,
    TabsComponent,
    TabItemComponent,
    ButtonToggleComponent,
    NgForOf,
  ],
  templateUrl: './citation-dialog.component.html',
  styleUrls: ['./citation-dialog.component.scss', '../generic-dialog.scss'],
})
export class CitationDialogComponent {
  document!: Metadata;

  shareableDocumentTypes: any[] = [];

  isLoading = false;
  error: string | null = null;
  citationResponse: CitationResponse | null = null;

  activeCitationPid: string = '';
  activeTabLabel: string = '';

  @Output() close = new EventEmitter<void>();

  private dialogRef = inject(MatDialogRef<CitationDialogComponent>, { optional: true });
  data = inject<any>(MAT_DIALOG_DATA);

  private citationService = inject(CitationService);
  private translationService = inject(TranslateService);
  private environmentService = inject(EnvironmentService);
  private recordHandlerService = inject(RecordHandlerService);

  constructor() {
    this.document = this.data.document;
    this.loadShareableDocumentTypes();
    this.loadCitation();
  }

  onClose() {
    this.close.emit();
    this.dialogRef?.close();
  }

  onTabChanged(tabLabel: string): void {
    this.activeTabLabel = tabLabel;
  }

  copyToClipboard() {
    let textToCopy = '';

    switch (this.activeTabLabel.toLowerCase()) {
      case 'html': textToCopy = this.citationResponse?.iso690html || ''; break;
      case 'text': textToCopy = this.citationResponse?.iso690 || ''; break;
      case 'bibtex': textToCopy = this.citationResponse?.bibtex || ''; break;
      case 'wiki': textToCopy = this.citationResponse?.wiki || ''; break;
    }

    copyTextToClipboard(textToCopy);
  }

  toggledActiveCitationType(active: boolean, pid: string): void {
    if (active) {
      this.activeCitationPid = pid;
      this.loadCitation();
    }
  }

  loadShareableDocumentTypes(): void {
    this.shareableDocumentTypes = this.recordHandlerService.getShareableDocumentTypes(this.document);

    this.activeCitationPid = this.shareableDocumentTypes[0].pid;
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
      uuid: this.activeCitationPid,
      exp: 'all',
      format: 'txt',
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
