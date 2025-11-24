import {Component, Input} from '@angular/core';
import {TranslatePipe} from '@ngx-translate/core';

@Component({
  selector: 'app-export-document-section-item-component',
  imports: [
    TranslatePipe,
  ],
  templateUrl: './export-document-section-item-component.html',
  styleUrl: './export-document-section-item-component.scss',
})
export class ExportDocumentSectionItemComponent {

  @Input() title = '';
  @Input() icon = '';

}
