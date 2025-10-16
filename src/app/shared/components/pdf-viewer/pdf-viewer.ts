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
    this.pdfService.uuid = this.metadata?.uuid || null;
  }

}
