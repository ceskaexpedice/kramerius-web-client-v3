import { Component, computed, inject, Input } from '@angular/core';
import {
  ExportDocumentSectionItemComponent
} from '../export-document-section-item-component/export-document-section-item-component';
import { ExportService } from '../../../services/export.service';
import { IIIFViewerService } from '../../../services/iiif-viewer.service';
import { take } from 'rxjs';
import { DocumentInfoService } from '../../../services/document-info.service';
import { MatDialog } from '@angular/material/dialog';
import { DetailViewService } from '../../../../modules/detail-view-page/services/detail-view.service';
import { PageSelectionDialogComponent, PageSelectionDialogResult } from '../../../dialogs/page-selection-dialog/page-selection-dialog.component';

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
  dialog = inject(MatDialog);
  detailViewService = inject(DetailViewService);

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
    if (value === 'select-pages') {
      this.openPageSelectionDialog('page-selection-dialog--header-pdf');
    } else if (value === 'whole-document') {
      // TODO: Implement whole document PDF export
      console.log('PDF Export: whole-document');
    }
  }

  onPrintSubmit(value: string) {
    if (value === 'select-pages') {
      this.openPageSelectionDialog('page-selection-dialog--header-print');
    } else if (value === 'whole-document') {
      // TODO: Implement whole document print
      console.log('Print: whole-document');
    }
  }

  /**
   * Opens the page selection dialog
   */
  private openPageSelectionDialog(titleKey: string): void {
    const pages = this.detailViewService.pages;

    if (!pages || pages.length === 0) {
      console.warn('No pages available for selection');
      return;
    }

    const dialogRef = this.dialog.open(PageSelectionDialogComponent, {
      data: {
        pages: pages,
        title: titleKey
      },
      width: '90vw',
      maxWidth: '1200px',
      maxHeight: '90vh'
    });

    dialogRef.afterClosed().subscribe((result: PageSelectionDialogResult) => {
      if (result && result.selectedPagePids && result.selectedPagePids.length > 0) {
        console.log('Selected pages:', result.selectedPagePids);
        // TODO: Handle the selected pages for export/print
      }
    });
  }

}
