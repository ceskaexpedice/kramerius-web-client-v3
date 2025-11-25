import { Component, computed, inject, Input } from '@angular/core';
import {
  ExportDocumentSectionItemComponent
} from '../export-document-section-item-component/export-document-section-item-component';
import { ExportService } from '../../../services/export.service';
import { IIIFViewerService } from '../../../services/iiif-viewer.service';
import { take } from 'rxjs';
import { DocumentInfoService } from '../../../services/document-info.service';

@Component({
  selector: 'app-export-document-section-component',
  imports: [
    ExportDocumentSectionItemComponent,
  ],
  templateUrl: './export-document-section-component.html',
  styleUrl: './export-document-section-component.scss',
})
export class ExportDocumentSectionComponent {

  @Input() pagePid: string | null = null;

  exportService = inject(ExportService);
  iiifViewerService = inject(IIIFViewerService);
  documentInfoService = inject(DocumentInfoService);

  // Computed signal that updates jpegOptions based on license access
  jpegOptions = computed(() => {
    const canAccess = this.documentInfoService.canAccessDocument();
    return [
      { label: 'current-page', value: 'current-page', disabled: !canAccess },
      { label: 'crop-page', value: 'crop-page', disabled: !canAccess }
    ];
  });

  pdfOptions = [
    { label: 'whole-document', value: 'whole-document', disabled: false },
    { label: 'select-pages', value: 'select-pages', disabled: false }
  ];

  printOptions = [
    { label: 'whole-document', value: 'whole-document', disabled: false },
    { label: 'select-pages', value: 'select-pages', disabled: false }
  ];

  onJpegOptionChange(value: string) {
    if (value === 'crop-page') {
      this.iiifViewerService.setSelectionMode(true);
    } else {
      this.iiifViewerService.setSelectionMode(false);
    }
  }

  onJpegSubmit(value: string) {
    if (value === 'current-page' && this.pagePid) {
      this.exportService.exportJpeg(this.pagePid);
    } else if (value === 'crop-page' && this.pagePid) {
      this.iiifViewerService.selectedArea$.pipe(take(1)).subscribe(rect => {
        if (rect) {
          this.exportService.exportJpegCrop(this.pagePid!, rect);
        } else {
          console.warn('No area selected for crop export');
        }
      });
    } else {
      console.log('JPEG Export:', value);
    }
  }

  onPdfSubmit(value: string) {
    console.log('PDF Export:', value);
  }

  onPrintSubmit(value: string) {
    console.log('Print:', value);
  }

}
