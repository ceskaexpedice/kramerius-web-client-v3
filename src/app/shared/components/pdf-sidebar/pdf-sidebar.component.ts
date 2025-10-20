import {Component, inject} from '@angular/core';
import {PdfService} from '../../services/pdf.service';
import {PdfContentTreeComponent} from '../pdf-content-tree/pdf-content-tree.component';
import {PdfPagesGridComponent} from '../pdf-pages-grid/pdf-pages-grid.component';
import {TabsComponent} from '../tabs/tabs.component';
import {TabItemComponent} from '../tabs/tab-item.component';

@Component({
  selector: 'app-pdf-sidebar',
  imports: [
    PdfContentTreeComponent,
    PdfPagesGridComponent,
    TabsComponent,
    TabItemComponent
  ],
  templateUrl: './pdf-sidebar.component.html',
  styleUrl: './pdf-sidebar.component.scss'
})
export class PdfSidebarComponent {
  public pdfService = inject(PdfService);
}
