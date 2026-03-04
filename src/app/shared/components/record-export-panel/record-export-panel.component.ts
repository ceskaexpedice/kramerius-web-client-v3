import { Component, computed, inject, Input, OnInit, Output, EventEmitter, signal } from '@angular/core';
import { SearchDocument } from '../../../modules/models/search-document';
import { ExportService } from '../../services/export.service';
import { AppConfigService } from '../../services/app-config.service';
import { MatDialog } from '@angular/material/dialog';
import { SolrService } from '../../../core/solr/solr.service';
import { UserService } from '../../services/user.service';
import { TranslatePipe } from '@ngx-translate/core';
import { NgIf } from '@angular/common';
import { Page } from '../../models/page.model';
import {
  ExportDocumentSectionItemComponent
} from '../metadata-sidebar/export-document-section-item-component/export-document-section-item-component';
import {
  PageSelectionDialogComponent,
  PageSelectionDialogResult
} from '../../dialogs/page-selection-dialog/page-selection-dialog.component';

@Component({
  selector: 'app-record-export-panel',
  imports: [
    TranslatePipe,
    NgIf,
    ExportDocumentSectionItemComponent,
  ],
  templateUrl: './record-export-panel.component.html',
  styleUrl: './record-export-panel.component.scss',
})
export class RecordExportPanelComponent implements OnInit {

  @Input() record!: SearchDocument;
  @Output() close = new EventEmitter<void>();

  private exportService = inject(ExportService);
  private appConfig = inject(AppConfigService);
  private dialog = inject(MatDialog);
  private solrService = inject(SolrService);
  private userService = inject(UserService);

  private pages = signal<Page[]>([]);
  private pagesLoaded = signal(false);
  loading = signal(false);

  private maxRange = computed(() => this.appConfig.pdfMaxRange());

  pdfOptions = computed(() => {
    const pages = this.pages();
    const loaded = this.pagesLoaded();
    const exportable = pages.filter(p => this.exportService.hasExportableLicense(p));
    const max = this.maxRange();
    const hasExportable = exportable.length > 0;

    const disableWhole = !loaded || !hasExportable || pages.length > max || exportable.length > max;
    const disableSelect = !loaded || !hasExportable;

    const options = [
      { label: 'whole-document', value: 'whole-document', disabled: disableWhole },
      { label: 'select-pages', value: 'select-pages', disabled: disableSelect },
    ];

    if (this.userService.isLoggedIn) {
      options.push({ label: 'whole-document-visk2026', value: 'whole-document-visk2026', disabled: !loaded });
    }

    return options;
  });

  printOptions = computed(() => {
    const pages = this.pages();
    const loaded = this.pagesLoaded();
    const exportable = pages.filter(p => this.exportService.hasExportableLicense(p));
    const max = this.maxRange();
    const hasExportable = exportable.length > 0;

    const disableWhole = !loaded || !hasExportable || pages.length > max || exportable.length > max;
    const disableSelect = !loaded || !hasExportable;

    return [
      { label: 'whole-document', value: 'whole-document', disabled: disableWhole },
      { label: 'select-pages', value: 'select-pages', disabled: disableSelect },
    ];
  });

  ngOnInit(): void {
    this.loadPages();
  }

  private loadPages(): void {
    this.loading.set(true);
    this.solrService.getChildrenByModel(this.record.pid, 'rels_ext_index.sort asc', null)
      .subscribe({
        next: (children: any[]) => {
          const pages = (children || []).filter(
            (c: any) => c.model === 'page' || c.model === 'periodicalpage'
          ) as Page[];
          this.pages.set(pages);
          this.pagesLoaded.set(true);
          this.loading.set(false);
        },
        error: () => {
          this.pagesLoaded.set(true);
          this.loading.set(false);
        }
      });
  }

  onPdfSubmit(value: string): void {
    if (value === 'whole-document') {
      const exportable = this.pages().filter(p => this.exportService.hasExportableLicense(p));
      this.exportService.exportPdfSelection(exportable.map(p => p.pid), this.record.title);
    } else if (value === 'select-pages') {
      this.openPageSelectionDialog('page-selection-dialog--header-pdf', 'pdf');
    } else if (value === 'whole-document-visk2026') {
      this.exportService.exportVisk2026(this.record.pid);
    }
  }

  epubOptions = computed(() => {
    const loaded = this.pagesLoaded();
    return [
      { label: 'whole-document', value: 'whole-document', disabled: !loaded },
      { label: 'select-pages', value: 'select-pages', disabled: !loaded },
    ];
  });

  textOptions = computed(() => {
    const loaded = this.pagesLoaded();
    return [
      { label: 'whole-document', value: 'whole-document', disabled: !loaded },
      { label: 'select-pages', value: 'select-pages', disabled: !loaded },
    ];
  });

  onPrintSubmit(value: string): void {
    if (value === 'whole-document') {
      const exportable = this.pages().filter(p => this.exportService.hasExportableLicense(p));
      this.exportService.printPdfSelection(exportable.map(p => p.pid));
    } else if (value === 'select-pages') {
      this.openPageSelectionDialog('page-selection-dialog--header-print', 'print');
    }
  }

  onEpubSubmit(_value: string): void {
    // TODO: implement EPUB export
  }

  onTextSubmit(_value: string): void {
    // TODO: implement TEXT export
  }

  private openPageSelectionDialog(titleKey: string, exportType: 'pdf' | 'print'): void {
    const exportable = this.pages().filter(p => this.exportService.hasExportableLicense(p));
    if (exportable.length === 0) return;

    const dialogRef = this.dialog.open(PageSelectionDialogComponent, {
      data: {
        pages: exportable,
        title: titleKey,
        maxSelectionCount: this.maxRange(),
      },
      width: '90vw',
      maxWidth: '1200px',
      maxHeight: '90vh',
    });

    dialogRef.afterClosed().subscribe((result: PageSelectionDialogResult) => {
      if (result?.selectedPagePids?.length) {
        if (exportType === 'pdf') {
          this.exportService.exportPdfSelection(result.selectedPagePids, this.record.title);
        } else {
          this.exportService.printPdfSelection(result.selectedPagePids);
        }
      }
    });
  }
}
