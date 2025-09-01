import { Injectable, inject } from '@angular/core';
import { SearchDocument } from '../../modules/models/search-document';
import { SolrService } from '../../core/solr/solr.service';
import { Observable, forkJoin, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

export enum ExportFormat {
  JSON = 'json',
  CSV = 'csv',
  TXT = 'txt'
}

export interface ExportOptions {
  format: ExportFormat;
  filename?: string;
  includeMetadata?: boolean;
  includeImages?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ExportService {
  private solrService = inject(SolrService);

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
    // For now, return empty array - in real implementation, 
    // you would fetch detailed information for each item
    // This would typically involve API calls to get full metadata
    return of([]);
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

        // Define CSV headers
        const headers = [
          'PID',
          'Title',
          'Root Title',
          'Authors',
          'Date',
          'Model',
          'Accessibility',
          'Languages'
        ];

        // Create CSV rows
        const csvRows = [
          headers.join(','), // Header row
          ...items.map(item => this.itemToCsvRow(item))
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
  getAvailableFormats(): Array<{value: ExportFormat, label: string}> {
    return [
      { value: ExportFormat.JSON, label: 'JSON' },
      { value: ExportFormat.CSV, label: 'CSV' },
      { value: ExportFormat.TXT, label: 'Text' }
    ];
  }
}