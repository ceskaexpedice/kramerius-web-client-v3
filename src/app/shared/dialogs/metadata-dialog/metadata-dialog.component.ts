import { Component, EventEmitter, inject, Output, OnInit, ChangeDetectorRef } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';
import { TabsComponent } from '../../components/tabs/tabs.component';
import { TabItemComponent } from '../../components/tabs/tab-item.component';
import { DocumentHierarchyItem, DocumentHierarchySelectorComponent } from '../../components/document-hierarchy-selector/document-hierarchy-selector.component';
import { Metadata } from '../../models/metadata.model';
import { NgIf, NgFor } from '@angular/common';
import { KrameriusApiService } from '../../services/kramerius-api.service';
import { LocalStorageService } from '../../services/local-storage.service';

@Component({
    selector: 'app-metadata-dialog',
  imports: [
    TabsComponent,
    TabItemComponent,
    DocumentHierarchySelectorComponent,
    NgIf,
    NgFor,
  ],
    templateUrl: './metadata-dialog.component.html',
    styleUrls: ['./metadata-dialog.component.scss', '../generic-dialog.scss']
})
export class MetadataDialogComponent implements OnInit {
    document!: Metadata;
    selectedPid: string = '';
    selectedModel: string = '';
    activeTabLabel: string = 'mods'; // Default tab

    isLoading = false;
    error: string | null = null;
    content: string = '';

    private cache: { [pid: string]: { [format: string]: string } } = {};

    @Output() close = new EventEmitter<void>();

    private dialogRef = inject(MatDialogRef<MetadataDialogComponent>, { optional: true });
    data = inject<any>(MAT_DIALOG_DATA);

    private api = inject(KrameriusApiService);
    private localStorage = inject(LocalStorageService);
    private translate = inject(TranslateService);
    private cdr = inject(ChangeDetectorRef);

    constructor() {
        this.document = this.data.document;
    }

    ngOnInit() {
        const lastTab = this.localStorage.get<string>('admin.metadata.resource');
        if (lastTab) {
            this.activeTabLabel = lastTab;
        }
    }

    onClose() {
        this.close.emit();
        this.dialogRef?.close();
    }

    onTabChanged(tabLabel: string): void {
        setTimeout(() => {
            this.activeTabLabel = tabLabel;
            this.localStorage.set('admin.metadata.resource', tabLabel);
            this.loadData();
            this.cdr.detectChanges();
        });
    }

    onHierarchySelectionChanged(selectedItem: DocumentHierarchyItem): void {
        setTimeout(() => {
            this.selectedPid = selectedItem.pid;
            this.selectedModel = selectedItem.model;

            this.loadData();
            this.cdr.detectChanges();
        });
    }

    loadData() {
        if (!this.selectedPid) return;

        // Check cache
        if (this.cache[this.selectedPid] && this.cache[this.selectedPid][this.activeTabLabel]) {
            this.content = this.cache[this.selectedPid][this.activeTabLabel];
            this.error = null;
            this.cdr.detectChanges();
            return;
        }

        this.isLoading = true;
        this.error = null;
        this.content = '';

        let request;
        const format = this.activeTabLabel;

        switch (format) {
            case 'mods':
                request = this.api.getMods(this.selectedPid, true);
                break;
            case 'dc':
                request = this.api.getDc(this.selectedPid, true);
                break;
            case 'solr':
                request = this.api.getSearchResults(`pid:"${this.selectedPid}"`, true);
                break;
            case 'foxml':
                request = this.api.getFoxml(this.selectedPid, true);
                break;
            case 'alto':
                request = this.api.getAlto(this.selectedPid, true);
                break;
            case 'ocr':
                request = this.api.getOcr(this.selectedPid, true);
                break;
            case 'item':
                request = this.api.getRawItem(this.selectedPid, true);
                break;
            case 'children':
                request = this.api.getRawChildren(this.selectedPid, true);
                break;
            case 'iiif':
                request = this.api.getIiifPresentation(this.selectedPid, true);
                break;
            default:
                this.isLoading = false;
                return;
        }

        const handleResult = (result: any) => {
            let formattedContent = '';
            if (typeof result === 'object') {
                if (format === 'solr') {
                    const doc = result.response?.docs?.[0] || result;
                    formattedContent = JSON.stringify(doc, null, 2);
                } else {
                    formattedContent = JSON.stringify(result, null, 2);
                }
            } else {
                if ((format === 'mods' || format === 'dc' || format === 'foxml' || format === 'alto') && typeof result === 'string') {
                    formattedContent = this.formatXml(result);
                } else {
                    formattedContent = result;
                }
            }

            this.content = formattedContent;
            this.cacheData(this.selectedPid, format, formattedContent);
            this.isLoading = false;
            this.cdr.detectChanges();
        };

        const handleError = (err: any) => {
            console.error('Error loading metadata:', err);
            this.error = this.translate.instant('metadata-dialog.missing-resource', {
                resource: format.toUpperCase(),
                model: this.selectedModel.toUpperCase()
            });
            if (this.error === 'metadata-dialog.missing-resource') {
                this.error = `Missing ${format.toUpperCase()} for ${this.selectedModel.toUpperCase()}`;
            }
            this.isLoading = false;
        };

        if (request instanceof Promise) {
            request.then(handleResult).catch(handleError);
        } else {
            request.subscribe({
                next: handleResult,
                error: handleError
            });
        }
    }

    cacheData(pid: string, format: string, data: string) {
        if (!this.cache[pid]) {
            this.cache[pid] = {};
        }
        this.cache[pid][format] = data;
    }

    openUrl() {
        const url = this.api.getMetadataUrl(this.selectedPid, this.activeTabLabel);
        if (url) {
            window.open(url, '_blank');
        }
    }

    formatXml(xml: string): string {
        let formatted = '';
        let indent = '';
        const tab = '  ';
        xml.split(/>\s*</).forEach(node => {
            if (node.match(/^\/\w/)) indent = indent.substring(tab.length);
            formatted += indent + '<' + node + '>\r\n';
            if (node.match(/^<?\w[^>]*[^\/]$/)) indent += tab;
        });
        return formatted.substring(1, formatted.length - 3);
    }

    get languageClass(): string {
        switch (this.activeTabLabel) {
            case 'mods':
              return 'language-xml';
          case 'dc':
            return 'language-xml';
          case 'foxml':
            return 'language-xml';
          case 'alto':
                return 'language-xml';
            case 'solr':
            case 'item':
            case 'children':
            case 'iiif':
                return 'language-json';
            case 'ocr':
                return 'language-text';
            default:
                return 'language-text';
        }
    }
}
