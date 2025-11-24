import { Injectable, inject } from '@angular/core';
import { SearchDocument } from '../../modules/models/search-document';
import { SolrService } from '../../core/solr/solr.service';
import { SelectionService } from './selection.service';
import { Observable, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { CsvSectionData } from '../dialogs/export-selected-dialog/components/export-csv-section/export-csv-section.component';
import { TranslateService } from '@ngx-translate/core';
import { EnvironmentService } from './environment.service';

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
  private solrService = inject(SolrService);
  private selectionService = inject(SelectionService);
  private translateService = inject(TranslateService);
  private environmentService = inject(EnvironmentService);

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
}
