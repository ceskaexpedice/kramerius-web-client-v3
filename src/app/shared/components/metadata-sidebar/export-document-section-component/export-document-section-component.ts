import { Component, computed, inject, Input, OnDestroy, OnInit, signal } from '@angular/core';
import {
  ExportDocumentSectionItemComponent
} from '../export-document-section-item-component/export-document-section-item-component';
import { ExportService } from '../../../services/export.service';
import { IIIFViewerService } from '../../../services/iiif-viewer.service';
import { Subscription, take } from 'rxjs';
import { DocumentInfoService } from '../../../services/document-info.service';
import { MatDialog } from '@angular/material/dialog';
import { DetailViewService } from '../../../../modules/detail-view-page/services/detail-view.service';
import { PageSelectionDialogComponent, PageSelectionDialogResult } from '../../../dialogs/page-selection-dialog/page-selection-dialog.component';
import { AppConfigService } from '../../../services/app-config.service';
import { PdfService } from '../../../services/pdf.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { UserService } from '../../../services/user.service';
import { Page } from '../../../models/page.model';

@Component({
  selector: 'app-export-document-section-component',
  imports: [
    ExportDocumentSectionItemComponent,
  ],
  templateUrl: './export-document-section-component.html',
  styleUrl: './export-document-section-component.scss',
})
export class ExportDocumentSectionComponent implements OnInit, OnDestroy {

  @Input() pagePid: string | null = null;

  exportService = inject(ExportService);
  iiifViewerService = inject(IIIFViewerService);
  documentInfoService = inject(DocumentInfoService);
  dialog = inject(MatDialog);
  detailViewService = inject(DetailViewService);
  appConfig = inject(AppConfigService);
  pdfService = inject(PdfService);
  userService = inject(UserService);

  iiifBookMode = toSignal(this.iiifViewerService.bookMode$, { initialValue: false });
  pdfProperties = toSignal(this.pdfService.properties$, { initialValue: this.pdfService.pdfProperties });

  selectedJpegOption: string | null = null;
  pdfLoading = signal(false);
  printLoading = signal(false);
  private cropSubscription?: Subscription;
  private selectionModeSubscription?: Subscription;
  private activeCropSession = false;

  ngOnInit(): void {
    this.selectionModeSubscription = this.iiifViewerService.isSelectionMode$.subscribe(isSelectionMode => {
      if (!isSelectionMode) {
        this.activeCropSession = false;
      }
    });

    this.cropSubscription = this.iiifViewerService.selectedArea$.subscribe(rect => {
      if (rect && this.activeCropSession && this.pagePid) {
        this.exportService.exportJpegCrop(this.pagePid, rect);
        this.iiifViewerService.setSelectionMode(false);
        this.activeCropSession = false;
        this.selectedJpegOption = 'current-page';

        setTimeout(() => this.iiifViewerService.clearSelectedArea(), 0);
      }
    });
  }

  /**
   * Get filtered pages that have exportable licenses
   */
  private getExportablePages(): Page[] {
    const pages = this.detailViewService.pages;
    if (!pages) return [];
    return pages.filter(page => this.exportService.hasExportableLicense(page));
  }

  // Computed signal that updates jpegOptions based on license access
  jpegOptions = computed(() => {
    const canAccess = this.documentInfoService.canAccessDocument();

    // Check if we are in book mode (either IIIF or PDF)
    const isIiifBookMode = this.iiifBookMode();
    const isPdfBookMode = this.pdfProperties()?.bookMode;
    const isBookMode = isIiifBookMode || isPdfBookMode;

    if (isBookMode) {
      const pages = this.detailViewService.pages;
      const currentIndex = this.detailViewService.currentPageIndex;

      // Check if left and right pages exist
      const leftPage = pages && pages[currentIndex];
      const rightPage = pages && pages[currentIndex + 1];

      const options = [];

      if (leftPage) {
        const hasLicense = this.exportService.hasExportableLicense(leftPage);
        options.push({ label: 'current-left-page', value: 'current-left-page', disabled: !canAccess || !hasLicense });
      }

      if (rightPage) {
        const hasLicense = this.exportService.hasExportableLicense(rightPage);
        options.push({ label: 'current-right-page', value: 'current-right-page', disabled: !canAccess || !hasLicense });
      }

      // For crop, use left page license
      const hasLicense = leftPage ? this.exportService.hasExportableLicense(leftPage) : false;
      options.push({ label: 'crop-page', value: 'crop-page', disabled: !canAccess || !hasLicense });

      return options;
    } else {
      // Find current page by pagePid
      const currentPage = this.detailViewService.pages?.find(p => p.pid === this.pagePid);
      const hasLicense = this.exportService.hasExportableLicense(currentPage);

      return [
        { label: 'current-page', value: 'current-page', disabled: !canAccess || !hasLicense },
        { label: 'crop-page', value: 'crop-page', disabled: !canAccess || !hasLicense }
      ];
    }
  });

  pdfOptions = computed(() => {
    const pages = this.detailViewService.pages;
    const maxRange = this.appConfig.pdfMaxRange();
    const exportablePages = this.getExportablePages();
    const hasExportablePages = exportablePages.length > 0;

    // Disable whole document if:
    // 1. Total pages exceed maxRange OR
    // 2. No exportable pages OR
    // 3. Exportable pages exceed maxRange
    const disableWholeDocument =
      !hasExportablePages ||
      (pages && pages.length > maxRange) ||
      exportablePages.length > maxRange;

    // Disable select pages if no exportable pages
    const disableSelectPages = !hasExportablePages;

    return [
      { label: 'whole-document', value: 'whole-document', disabled: disableWholeDocument },
      { label: 'select-pages', value: 'select-pages', disabled: disableSelectPages }
    ];
  });

  printOptions = computed(() => {
    const pages = this.detailViewService.pages;
    const maxRange = this.appConfig.pdfMaxRange();
    const exportablePages = this.getExportablePages();
    const hasExportablePages = exportablePages.length > 0;

    // Disable whole document if:
    // 1. Total pages exceed maxRange OR
    // 2. No exportable pages OR
    // 3. Exportable pages exceed maxRange
    const disableWholeDocument =
      !hasExportablePages ||
      (pages && pages.length > maxRange) ||
      exportablePages.length > maxRange;

    // Disable select pages if no exportable pages
    const disableSelectPages = !hasExportablePages;

    return [
      { label: 'whole-document', value: 'whole-document', disabled: disableWholeDocument },
      { label: 'select-pages', value: 'select-pages', disabled: disableSelectPages }
    ];
  });

  onJpegOptionChange(value: string) {
    this.selectedJpegOption = value;
    if (value === 'crop-page') {
      this.activeCropSession = true;
      this.iiifViewerService.setSelectionMode(true);
    } else {
      this.activeCropSession = false;
      this.iiifViewerService.setSelectionMode(false);
    }
  }

  onJpegSubmit(value: string) {
    if (value === 'current-page' && this.pagePid) {
      this.exportService.exportJpeg(this.pagePid);
    } else if (value === 'current-left-page') {
      const pages = this.detailViewService.pages;
      const currentIndex = this.detailViewService.currentPageIndex;
      const leftPage = pages[currentIndex];
      if (leftPage) {
        this.exportService.exportJpeg(leftPage.pid);
      }
    } else if (value === 'current-right-page') {
      const pages = this.detailViewService.pages;
      const currentIndex = this.detailViewService.currentPageIndex;
      const rightPage = pages[currentIndex + 1];
      if (rightPage) {
        this.exportService.exportJpeg(rightPage.pid);
      }
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
      const exportablePages = this.getExportablePages();
      const pageUuids = exportablePages.map(page => page.pid);
      if (pageUuids.length > 0) {
        this.pdfLoading.set(true);
        this.exportService.exportPdfSelection(pageUuids, this.detailViewService.title).subscribe({
          next: () => this.pdfLoading.set(false),
          error: () => this.pdfLoading.set(false),
        });
      }
    }
  }

  onPrintSubmit(value: string) {
    if (value === 'select-pages') {
      this.openPageSelectionDialog('page-selection-dialog--header-print', 'print');
    } else if (value === 'whole-document') {
      const exportablePages = this.getExportablePages();
      const pageUuids = exportablePages.map(page => page.pid);
      if (pageUuids.length > 0) {
        this.exportService.printPdfSelection(pageUuids);
      }
    }
  }

  /**
   * Opens the page selection dialog
   * Only shows pages with exportable licenses
   */
  private openPageSelectionDialog(titleKey: string, exportType: 'pdf' | 'print'): void {
    // Get only pages with exportable licenses
    const exportablePages = this.getExportablePages();

    if (!exportablePages || exportablePages.length === 0) {
      console.warn('No pages with exportable licenses available for selection');
      return;
    }

    const dialogRef = this.dialog.open(PageSelectionDialogComponent, {
      data: {
        pages: exportablePages,
        title: titleKey,
        maxSelectionCount: this.appConfig.pdfMaxRange()
      },
      width: '90vw',
      maxWidth: '1200px',
      maxHeight: '90vh'
    });

    dialogRef.afterClosed().subscribe((result: PageSelectionDialogResult) => {
      if (result && result.selectedPagePids && result.selectedPagePids.length > 0) {
        if (exportType === 'pdf') {
          this.pdfLoading.set(true);
          this.exportService.exportPdfSelection(result.selectedPagePids, this.detailViewService.title).subscribe({
            next: () => this.pdfLoading.set(false),
            error: () => this.pdfLoading.set(false),
          });
        } else if (exportType === 'print') {
          this.exportService.printPdfSelection(result.selectedPagePids);
        }
      }
    });
  }

  ngOnDestroy(): void {
    if (this.cropSubscription) {
      this.cropSubscription.unsubscribe();
    }
    if (this.selectionModeSubscription) {
      this.selectionModeSubscription.unsubscribe();
    }
    this.iiifViewerService.setSelectionMode(false);
  }

}
