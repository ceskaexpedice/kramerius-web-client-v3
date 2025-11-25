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
import { AppConfigService } from '../../../services/app-config.service';

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
  appConfig = inject(AppConfigService);

  // Computed signal that updates jpegOptions based on license access
  jpegOptions = computed(() => {
    const canAccess = this.documentInfoService.canAccessDocument();
    return [
      { label: 'current-page', value: 'current-page', disabled: !canAccess },
      { label: 'crop-page', value: 'crop-page', disabled: !canAccess }
    ];
  });

  pdfOptions = computed(() => {
    const pages = this.detailViewService.pages;
    const maxRange = this.appConfig.pdfMaxRange();
    const disableWholeDocument = pages && pages.length > maxRange;

    return [
      { label: 'whole-document', value: 'whole-document', disabled: disableWholeDocument },
      { label: 'select-pages', value: 'select-pages', disabled: false }
    ];
  });

  printOptions = computed(() => {
    const pages = this.detailViewService.pages;
    const maxRange = this.appConfig.pdfMaxRange();
    const disableWholeDocument = pages && pages.length > maxRange;

    return [
      { label: 'whole-document', value: 'whole-document', disabled: disableWholeDocument },
      { label: 'select-pages', value: 'select-pages', disabled: false }
    ];
  });

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
      this.openPageSelectionDialog('page-selection-dialog--header-pdf', 'pdf');
    } else if (value === 'whole-document') {
      const pageUuids = this.detailViewService.pages.map(page => page.pid);
      if (pageUuids.length > 0) {
        this.exportService.exportPdfSelection(pageUuids);
      } else {
        console.warn('No pages available for PDF export');
      }
    }
  }

  onPrintSubmit(value: string) {
    if (value === 'select-pages') {
      this.openPageSelectionDialog('page-selection-dialog--header-print', 'print');
    } else if (value === 'whole-document') {
      const pageUuids = this.detailViewService.pages.map(page => page.pid);
      if (pageUuids.length > 0) {
        this.exportService.printPdfSelection(pageUuids);
      } else {
        console.warn('No pages available for print');
      }
    }
  }

  /**
   * Opens the page selection dialog
   */
  private openPageSelectionDialog(titleKey: string, exportType: 'pdf' | 'print'): void {
    const pages = this.detailViewService.pages;

    if (!pages || pages.length === 0) {
      console.warn('No pages available for selection');
      return;
    }

    const dialogRef = this.dialog.open(PageSelectionDialogComponent, {
      data: {
        pages: pages,
        title: titleKey,
        maxSelectionCount: this.appConfig.pdfMaxRange()
      },
      width: '90vw',
      maxWidth: '1200px',
      maxHeight: '90vh'
    });

    dialogRef.afterClosed().subscribe((result: PageSelectionDialogResult) => {
      if (result && result.selectedPagePids && result.selectedPagePids.length > 0) {
        console.log('Selected pages:', result.selectedPagePids);

        if (exportType === 'pdf') {
          // Export PDF with selected pages
          this.exportService.exportPdfSelection(result.selectedPagePids);
        } else if (exportType === 'print') {
          // Print selected pages
          this.exportService.printPdfSelection(result.selectedPagePids);
        }
      }
    });
  }

}
