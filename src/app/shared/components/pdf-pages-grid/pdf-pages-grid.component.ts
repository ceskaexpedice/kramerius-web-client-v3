import {Component, inject, OnInit} from '@angular/core';
import {PdfService} from '../../services/pdf.service';
import {NgFor, NgIf} from '@angular/common';

export interface PdfPageThumbnail {
  pageNumber: number;
  thumbnailUrl: string;
}

@Component({
  selector: 'app-pdf-pages-grid',
  imports: [NgFor, NgIf],
  templateUrl: './pdf-pages-grid.component.html',
  styleUrl: './pdf-pages-grid.component.scss'
})
export class PdfPagesGridComponent implements OnInit {
  public pdfService = inject(PdfService);
  public pages: PdfPageThumbnail[] = [];
  public currentPage = 1;

  ngOnInit(): void {
    this.pdfService.pages$.subscribe(pages => {
      this.pages = pages || [];
    });

    this.pdfService.currentPage$.subscribe(page => {
      this.currentPage = page;
    });
  }

  navigateToPage(pageNumber: number): void {
    this.pdfService.navigateToPage(pageNumber);
  }
}
