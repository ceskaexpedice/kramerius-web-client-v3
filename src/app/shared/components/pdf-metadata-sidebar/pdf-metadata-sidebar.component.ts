import {Component, inject, Input} from '@angular/core';
import {Metadata} from '../../models/metadata.model';
import {TabsComponent} from '../tabs/tabs.component';
import {TabItemComponent} from '../tabs/tab-item.component';
import {MetadataSection} from '../metadata-section/metadata-section';
import {RecordHandlerService} from '../../services/record-handler.service';
import {DetailViewService} from '../../../modules/detail-view-page/services/detail-view.service';
import {TranslatePipe} from '@ngx-translate/core';

@Component({
  selector: 'app-pdf-metadata-sidebar',
  imports: [TabsComponent, TabItemComponent, MetadataSection, TranslatePipe],
  templateUrl: './pdf-metadata-sidebar.component.html',
  styleUrl: './pdf-metadata-sidebar.component.scss'
})
export class PdfMetadataSidebarComponent {
  @Input() metadata: Metadata | null = null;

  recordHandler = inject(RecordHandlerService);
  detailService = inject(DetailViewService);

  exportAsPdf(): void {
    // TODO: Implement PDF export
    console.log('Export as PDF');
  }

  exportAsText(): void {
    // TODO: Implement text export
    console.log('Export as text');
  }

  exportAsImages(): void {
    // TODO: Implement images export
    console.log('Export as images');
  }

  closeMetadataSidebar(): void {
    this.detailService.hideMetadataSidebar();
  }
}
