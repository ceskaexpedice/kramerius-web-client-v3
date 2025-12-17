import {Component, inject} from '@angular/core';
import {PdfService} from '../../services/pdf.service';
import {PdfContentTreeComponent} from '../pdf-content-tree/pdf-content-tree.component';
import {InputComponent} from '../input/input.component';
import {PageNavigatorComponent} from '../page-navigator/page-navigator.component';
import {TranslateModule} from '@ngx-translate/core';
import {AsyncPipe} from '@angular/common';
import {FindState} from 'ngx-extended-pdf-viewer';
import {SearchNavigationComponent} from '../search-navigation/search-navigation.component';

@Component({
  selector: 'app-pdf-sidebar',
  imports: [
    PdfContentTreeComponent,
    InputComponent,
    PageNavigatorComponent,
    TranslateModule,
    AsyncPipe,
    SearchNavigationComponent
  ],
  templateUrl: './pdf-sidebar.component.html',
  styleUrl: './pdf-sidebar.component.scss'
})
export class PdfSidebarComponent {
  public pdfService = inject(PdfService);
  private searchTimeout: any;

  goToNext(): void {
    const currentPage = this.pdfService.getCurrentPage();
    const totalPages = this.pdfService.getTotalPages();
    if (currentPage < totalPages) {
      this.pdfService.navigateToPage(currentPage + (this.pdfService.pdfProperties.bookMode ? 2 : 1));
    }
  }

  goToPrevious(): void {
    const currentPage = this.pdfService.getCurrentPage();
    if (currentPage > 1) {
      this.pdfService.navigateToPage(currentPage - (this.pdfService.pdfProperties.bookMode ? 2 : 1));
    }
  }

  goToPage(page: number): void {
    this.pdfService.navigateToPage(page);
  }

  onSearchChange(query: string | number): void {
    const searchQuery = typeof query === 'string' ? query : query.toString();
    this.pdfService.setSearchQuery(searchQuery);

    // Clear existing timeout
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }

    // Debounce the search - wait 500ms after user stops typing
    this.searchTimeout = setTimeout(() => {
      this.pdfService.find();
    }, 500);
  }

  findNextMatch(): void {
    this.pdfService.findNext();
  }

  findPreviousMatch(): void {
    this.pdfService.findPrevious();
  }

  protected readonly FindState = FindState;
}
