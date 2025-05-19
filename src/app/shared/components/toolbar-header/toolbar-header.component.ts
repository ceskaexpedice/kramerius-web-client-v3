import {Component, EventEmitter, Input, Output} from '@angular/core';

@Component({
  selector: 'app-toolbar-header',
	imports: [],
  templateUrl: './toolbar-header.component.html',
  styleUrl: './toolbar-header.component.scss'
})
export class ToolbarHeaderComponent {

  @Input() title: string = '';

  @Output() goBack = new EventEmitter<void>();

  goBackClicked() {
    this.goBack.emit();
  }

}
