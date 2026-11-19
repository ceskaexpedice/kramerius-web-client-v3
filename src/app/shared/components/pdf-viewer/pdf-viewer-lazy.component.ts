import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { Metadata } from '../../models/metadata.model';
import { PdfViewer } from './pdf-viewer';

/**
 * Loads the PDF viewer (ngx-extended-pdf-viewer, ~0.9 MB) on demand.
 *
 * DetailViewPageComponent is NgModule-declared, so its own template cannot
 * defer dependencies; this standalone wrapper can. PdfViewer must not be
 * imported anywhere else statically, or it lands back in the detail chunk
 * together with OpenSeadragon and every image document pays for it.
 */
@Component({
  selector: 'app-pdf-viewer-lazy',
  imports: [PdfViewer],
  template: `
    @defer (on immediate) {
      <app-pdf-viewer [metadata]="metadata"></app-pdf-viewer>
    }
  `,
  styles: `:host { display: contents; }`,
  changeDetection: ChangeDetectionStrategy.Default,
})
export class PdfViewerLazyComponent {
  @Input() metadata: Metadata | null = null;
}
