import {Component, inject, Input, OnInit} from '@angular/core';
import {NgxExtendedPdfViewerModule} from 'ngx-extended-pdf-viewer';
import {Metadata} from '../../models/metadata.model';
import {PdfService} from '../../services/pdf.service';

@Component({
  selector: 'app-pdf-viewer',
  imports: [
    NgxExtendedPdfViewerModule,
  ],
  templateUrl: './pdf-viewer.html',
  styleUrl: './pdf-viewer.scss'
})
export class PdfViewer implements OnInit {

  @Input() metadata: Metadata | null = null;

  public pdfService = inject(PdfService);

  constructor() {
  }

  ngOnInit(): void {
    console.log('ngOnInit');
    console.log('metadata', this.metadata);

    this.pdfService.uuid = this.metadata?.uuid || null;
    console.log('url::', this.pdfService.url);
  }

}
