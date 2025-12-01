import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { Metadata } from '../../../../shared/models/metadata.model';

@Component({
  selector: 'app-monograph-right-sidebar-content',
  imports: [
    TranslatePipe,
  ],
  templateUrl: './monograph-right-sidebar-content.html',
  styleUrl: './monograph-right-sidebar-content.scss',
})
export class MonographRightSidebarContent {

  metadata: Metadata | undefined;

  @Output() onClose = new EventEmitter();

  @Input() set setMetadata(metadata: Metadata) {
    this.metadata = metadata;
  }

  close() {
    this.onClose.emit();
  }
}
