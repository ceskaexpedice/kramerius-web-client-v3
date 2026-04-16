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
import {
  EmailExportDialogComponent,
  EmailExportType
} from '../../dialogs/email-export-dialog/email-export-dialog.component';
import { LoginPromptDialogComponent } from '../../dialogs/login-prompt-dialog/login-prompt-dialog.component';
import { AuthService } from '../../../core/auth/auth.service';
import { Router } from '@angular/router';
import { ToastService } from '../../services/toast.service';

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
  private toastService = inject(ToastService);
  private authService = inject(AuthService);
  private router = inject(Router);

  private pages = signal<Page[]>([]);
  private pagesLoaded = signal(false);
  loading = signal(false);
  pdfLoading = signal(false);
  expandedSection = signal<string | null>('print');

  private maxRange = computed(() => this.appConfig.pdfMaxRange());

  isLoggedIn = computed(() => !!this.userService.userSession$()?.authenticated);

  pdfOptions = computed(() => {
    const pages = this.pages();
    const loaded = this.pagesLoaded();
    const exportable = pages.filter(p => this.exportService.hasExportableLicense(p));
    const max = this.maxRange();
    const hasExportable = exportable.length > 0;

    const disableLegacy = !loaded || !hasExportable || pages.length > max || exportable.length > max;
    const disableSelect = !loaded || !hasExportable;

    return [
      { label: 'whole-document-legacy', value: 'whole-document-legacy', disabled: disableLegacy },
      { label: 'select-pages', value: 'select-pages', disabled: disableSelect },
      { label: 'whole-document', value: 'whole-document', disabled: !loaded },
    ];
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

  epubOptions = computed(() => {
    const loaded = this.pagesLoaded();
    return [
      { label: 'whole-document', value: 'whole-document', disabled: !loaded },
      // { label: 'select-pages', value: 'select-pages', disabled: !loaded },
    ];
  });

  textOptions = computed(() => {
    const loaded = this.pagesLoaded();
    return [
      { label: 'whole-document', value: 'whole-document', disabled: !loaded },
      // { label: 'select-pages', value: 'select-pages', disabled: !loaded },
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
    if (!this.isLoggedIn()) {
      this.openLoginPrompt();
      return;
    }
    if (value === 'whole-document-legacy') {
      const exportable = this.pages().filter(p => this.exportService.hasExportableLicense(p));
      this.pdfLoading.set(true);
      this.exportService.exportPdfSelection(exportable.map(p => p.pid), this.record.title).subscribe({
        next: () => this.pdfLoading.set(false),
        error: () => this.pdfLoading.set(false),
      });
    } else if (value === 'select-pages') {
      this.openPageSelectionDialog('page-selection-dialog--header-pdf', 'pdf');
    } else if (value === 'whole-document') {
      this.openEmailExportDialog('pdf');
    }
  }

  onPrintSubmit(value: string): void {
    if (!this.isLoggedIn()) {
      this.openLoginPrompt();
      return;
    }
    if (value === 'whole-document') {
      const exportable = this.pages().filter(p => this.exportService.hasExportableLicense(p));
      this.exportService.printPdfSelection(exportable.map(p => p.pid));
    } else if (value === 'select-pages') {
      this.openPageSelectionDialog('page-selection-dialog--header-print', 'print');
    }
  }

  onSectionToggle(section: string): void {
    this.expandedSection.update(current => current === section ? null : section);
  }

  onEpubSubmit(value: string): void {
    if (!this.isLoggedIn()) {
      this.openLoginPrompt();
      return;
    }
    if (value === 'whole-document') {
      this.openEmailExportDialog('epub');
    }
  }

  onTextSubmit(value: string): void {
    if (!this.isLoggedIn()) {
      this.openLoginPrompt();
      return;
    }
    if (value === 'whole-document') {
      this.openEmailExportDialog('txt');
    }
  }

  private openLoginPrompt(): void {
    const dialogRef = this.dialog.open(LoginPromptDialogComponent, {
      data: {
        titleKey: 'login-required-export-title',
        messageKey: 'login-prompt-message-export',
      },
      width: '560px',
      maxWidth: '90vw',
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === 'login') {
        this.authService.login(this.router.url);
      }
    });
  }

  private openEmailExportDialog(exportType: EmailExportType): void {
    const dialogRef = this.dialog.open(EmailExportDialogComponent, {
      data: { pid: this.record.pid, exportType },
      width: '560px',
      maxWidth: '90vw',
    });

    dialogRef.afterClosed().subscribe((result: string) => {
      if (result === 'submitted') {
        this.toastService.show('email-export-dialog--success');
      } else if (result === 'error') {
        this.toastService.show('export-error');
      }
    });
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
          this.pdfLoading.set(true);
          this.exportService.exportPdfSelection(result.selectedPagePids, this.record.title).subscribe({
            next: () => this.pdfLoading.set(false),
            error: () => this.pdfLoading.set(false),
          });
        } else {
          this.exportService.printPdfSelection(result.selectedPagePids);
        }
      }
    });
  }
}
