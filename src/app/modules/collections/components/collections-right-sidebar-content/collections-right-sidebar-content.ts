import {Component, EventEmitter, Input, OnChanges, Output, SimpleChanges} from '@angular/core';
import {TranslatePipe} from '@ngx-translate/core';
import {Metadata} from '../../../../shared/models/metadata.model';

@Component({
  selector: 'app-collections-right-sidebar-content',
	imports: [
		TranslatePipe,
	],
  templateUrl: './collections-right-sidebar-content.html',
  styleUrl: './collections-right-sidebar-content.scss',
})
export class CollectionsRightSidebarContent {

  metadata: Metadata | undefined;

  @Output() onClose = new EventEmitter();

  @Input() set setMetadata(metadata: Metadata) {
    this.metadata = metadata;
  }

  close() {
    this.onClose.emit();
  }


}
