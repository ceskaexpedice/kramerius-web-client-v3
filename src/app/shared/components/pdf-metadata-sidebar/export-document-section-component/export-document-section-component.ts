import { Component } from '@angular/core';
import {
  ExportDocumentSectionItemComponent
} from '../export-document-section-item-component/export-document-section-item-component';

@Component({
  selector: 'app-export-document-section-component',
  imports: [
    ExportDocumentSectionItemComponent,
  ],
  templateUrl: './export-document-section-component.html',
  styleUrl: './export-document-section-component.scss',
})
export class ExportDocumentSectionComponent {

}
