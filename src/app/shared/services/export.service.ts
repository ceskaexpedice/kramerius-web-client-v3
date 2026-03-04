import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { SearchDocument } from '../../modules/models/search-document';
import { SolrService } from '../../core/solr/solr.service';
import { SelectionService } from './selection.service';
import { Observable, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { CsvSectionData } from '../dialogs/export-selected-dialog/components/export-csv-section/export-csv-section.component';
import { TranslateService } from '@ngx-translate/core';
import { EnvironmentService } from './environment.service';
import { Page } from '../models/page.model';
import { ToastService } from './toast.service';

export enum ExportFormat {
  JSON = 'json',
  CSV = 'csv',
  TXT = 'txt',
  XML = 'xml' // For future use
}

export interface ExportOptions {
  format: ExportFormat;
  filename?: string;
  includeMetadata?: boolean;
  includeImages?: boolean;
  csvOptions?: CsvSectionData;
}

@Injectable({
  providedIn: 'root'
})
export class ExportService {

  private readonly allowedLicenses = ['public', 'onsite'];

  private solrService = inject(SolrService);
  private selectionService = inject(SelectionService);
  private translateService = inject(TranslateService);
  private environmentService = inject(EnvironmentService);
  private http = inject(HttpClient);
  private toastService = inject(ToastService);

  exportVisk2026(pid: string): void {
    const baseUrl = this.environmentService.getBaseApiUrl();
    const url = `${baseUrl}/search/api/client/v7.0/items/${pid}/requests/generate_pdf`;
    this.toastService.show('loading');
    this.http.post(url, {}, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        const filename = `visk2026_${pid}_${this.getTimestamp()}.pdf`;
        this.downloadBlob(blob, filename);
        this.toastService.show('export-success');
      },
      error: (error) => {
        console.error('VISK2026 export failed', error);
        this.toastService.show('export-error');
      }
    });
  }

  exportJpeg(pid: string): void {
    const baseUrl = this.environmentService.getBaseApiUrl();
    const url = `${baseUrl}/search/iiif/${pid}/full/max/0/default.jpg`;
    window.open(url, '_blank');
  }

  exportJpegCrop(pid: string, rect: { x: number, y: number, width: number, height: number }): void {
    const baseUrl = this.environmentService.getBaseApiUrl();
    const region = `${Math.round(rect.x)},${Math.round(rect.y)},${Math.round(rect.width)},${Math.round(rect.height)}`;
    const url = `${baseUrl}/search/iiif/${pid}/${region}/max/0/default.jpg`;
    window.open(url, '_blank');
  }

  /**
   * Export PDF from selected pages
   * @param pageUuids Array of page UUIDs to include in the PDF
   * @param title Title of the document for filename
   */
  exportPdfSelection(pageUuids: string[], title?: string): void {
    if (!pageUuids || pageUuids.length === 0) {
      console.warn('No pages selected for PDF export');
      return;
    }

    const baseUrl = this.environmentService.getBaseApiUrl();
    const currentLanguage = this.translateService.currentLang || 'cs';

    // Join UUIDs with comma
    const pidsParam = pageUuids.join(',');

    // Construct the PDF selection API URL
    const url = `${baseUrl}/search/api/client/v7.0/pdf/selection?pids=${pidsParam}&language=${currentLanguage}`;

    this.toastService.show('loading');

    this.http.get(url, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        const sanitizedTitle = title ? title.replace(/[^a-z0-9]/gi, '_').toLowerCase() : 'export_pdf';
        const filename = `${sanitizedTitle}_${this.getTimestamp()}.pdf`;
        this.downloadBlob(blob, filename);
        this.toastService.show('export-success');
      },
      error: (error) => {
        console.error('PDF export failed', error);
        this.toastService.show('export-error');
      }
    });
  }

  /**
   * Print PDF from selected pages
   * @param pageUuids Array of page UUIDs to include in the print PDF
   * @param pageSize Page size for printing (default: A4)
   * @param imgOp Image operation (default: FULL)
   */
  printPdfSelection(pageUuids: string[], pageSize: string = 'A4', imgOp: string = 'FULL'): void {
    if (!pageUuids || pageUuids.length === 0) {
      console.warn('No pages selected for print');
      return;
    }

    const baseUrl = this.environmentService.getBaseApiUrl();

    // Join UUIDs with comma
    const pidsParam = pageUuids.join(',');

    // Construct the local print PDF API URL
    const url = `${baseUrl}/search/localPrintPDF?pids=${pidsParam}&pagesize=${pageSize}&imgop=${imgOp}`;

    // Open in new tab to trigger print dialog
    window.open(url, '_blank');
  }



  exportSelectedItems(itemIds: string[], options: ExportOptions): Observable<void> {
    // Fetch full details for selected items
    return this.fetchItemDetails(itemIds).pipe(
      switchMap(items => {
        switch (options.format) {
          case ExportFormat.JSON:
            return this.exportAsJson(items, options);
          case ExportFormat.CSV:
            return this.exportAsCsv(items, options);
          case ExportFormat.TXT:
            return this.exportAsTxt(items, options);
          default:
            return of(void 0);
        }
      })
    );
  }

  private fetchItemDetails(itemIds: string[]): Observable<SearchDocument[]> {
    // First try to get items from current selection service
    const selectedItems = this.selectionService.getSelectedItems();
    const foundItems = selectedItems.filter(item => itemIds.includes(item.pid));

    // If we have all items from the selection service, use those
    if (foundItems.length === itemIds.length) {
      return of(foundItems);
    }

    // Otherwise, we'd need to fetch from API
    // For now, return the items we have and log missing ones
    const foundIds = foundItems.map(item => item.pid);
    const missingIds = itemIds.filter(id => !foundIds.includes(id));

    if (missingIds.length > 0) {
      console.warn('Some items not found in current page data:', missingIds);
      console.warn('Export will only include items from current page');
    }

    return of(foundItems);
  }

  private exportAsJson(items: SearchDocument[], options: ExportOptions): Observable<void> {
    return new Observable<void>(observer => {
      try {
        const exportData = {
          metadata: {
            exportDate: new Date().toISOString(),
            totalItems: items.length,
            format: 'json'
          },
          items: items.map(item => this.sanitizeItemForExport(item, options))
        };

        const jsonString = JSON.stringify(exportData, null, 2);
        const filename = options.filename || `export_${this.getTimestamp()}.json`;

        this.downloadFile(jsonString, filename, 'application/json');
        observer.next();
        observer.complete();
      } catch (error) {
        observer.error(error);
      }
    });
  }

  private exportAsCsv(items: SearchDocument[], options: ExportOptions): Observable<void> {
    return new Observable<void>(observer => {
      try {
        if (items.length === 0) {
          observer.next();
          observer.complete();
          return;
        }

        // Get selected fields from CSV options or use default fields
        const selectedFields = options.csvOptions?.fields?.filter(f => f.selected) || [];

        if (selectedFields.length === 0) {
          console.warn('No fields selected for CSV export');
          observer.next();
          observer.complete();
          return;
        }

        // Create headers from selected fields
        const headers = selectedFields.map(field => field.label);

        // Create CSV rows based on selected fields
        const csvRows = [
          headers.join(','), // Header row
          ...items.map(item => this.itemToCsvRowWithFields(item, selectedFields))
        ];

        const csvContent = csvRows.join('\n');
        const filename = options.filename || `export_${this.getTimestamp()}.csv`;

        this.downloadFile(csvContent, filename, 'text/csv');
        observer.next();
        observer.complete();
      } catch (error) {
        observer.error(error);
      }
    });
  }

  private exportAsTxt(items: SearchDocument[], options: ExportOptions): Observable<void> {
    return new Observable<void>(observer => {
      try {
        const textContent = [
          `Digital Library Export`,
          `Generated: ${new Date().toLocaleString()}`,
          `Total Items: ${items.length}`,
          ``,
          ...items.map((item, index) => [
            `${index + 1}. ${item.title || 'Untitled'}`,
            `   PID: ${item.pid}`,
            item.rootTitle ? `   Collection: ${item.rootTitle}` : '',
            item.authors?.length ? `   Authors: ${item.authors.join(', ')}` : '',
            item.date ? `   Date: ${item.date}` : '',
            `   Type: ${item.model}`,
            `   Access: ${item.accessibility}`,
            ``
          ].filter(line => line !== '').join('\n'))
        ].join('\n');

        const filename = options.filename || `export_${this.getTimestamp()}.txt`;

        this.downloadFile(textContent, filename, 'text/plain');
        observer.next();
        observer.complete();
      } catch (error) {
        observer.error(error);
      }
    });
  }

  private sanitizeItemForExport(item: SearchDocument, options: ExportOptions): any {
    const exportItem: any = {
      pid: item.pid,
      title: item.title,
      rootTitle: item.rootTitle,
      authors: item.authors,
      date: item.date,
      model: item.model,
      accessibility: item.accessibility
    };

    if (options.includeMetadata) {
      exportItem.metadata = {
        rootPid: item.rootPid,
        ownParentPid: item.ownParentPid,
        licenses: item.licenses,
        containsLicenses: item.containsLicenses,
        countPage: item.count_page,
        languages: item.languages,
        year: item.year,
        month: item.month,
        day: item.day
      };
    }

    return exportItem;
  }

  private itemToCsvRow(item: SearchDocument): string {
    const values = [
      item.pid || '',
      this.escapeCsvValue(item.title || ''),
      this.escapeCsvValue(item.rootTitle || ''),
      this.escapeCsvValue(item.authors?.join('; ') || ''),
      item.date || '',
      item.model || '',
      item.accessibility || '',
      this.escapeCsvValue(item.languages?.join('; ') || '')
    ];

    return values.join(',');
  }

  private itemToCsvRowWithFields(item: SearchDocument, selectedFields: any[]): string {
    const values = selectedFields.map(field => {
      const value = this.getFieldValue(item, field.key);
      return this.escapeCsvValue(value);
    });

    return values.join(',');
  }

  private getFieldValue(item: SearchDocument, fieldKey: string): string {
    switch (fieldKey) {
      case 'title':
        return item.title || '';
      case 'author':
        return item.authors?.join('; ') || '';
      case 'yearOfPublishing':
        return item.year?.toString() || item.date || '';
      case 'printCount':
        return item.count_page?.toString() || '';
      case 'keyword':
        return '';
      case 'geographicName':
        return '';
      case 'genre':
        return '';
      default:
        return '';
    }
  }

  private escapeCsvValue(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  private downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();

    // Cleanup
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  private downloadBlob(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  private getTimestamp(): string {
    return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  }

  // Helper method to get available export formats
  getAvailableFormats(): Array<{ value: ExportFormat, label: string }> {
    return [
      { value: ExportFormat.JSON, label: this.translateService.instant('export.formats.json') },
      { value: ExportFormat.CSV, label: this.translateService.instant('export.formats.csv') },
      { value: ExportFormat.TXT, label: this.translateService.instant('export.formats.text') }
    ];
  }

  /**
   * Helper method to check if a page has exportable license
   * A page is exportable if it has at least one of allowed license
   */
  hasExportableLicense(page: Page | undefined): boolean {

    if (!page) return false;
    const pageLicenses = page.licences || page.licenses_of_ancestors || [];
    // Check if there's any overlap between user licenses and page licenses
    return pageLicenses.some(license => this.allowedLicenses.includes(license));
  }
}
