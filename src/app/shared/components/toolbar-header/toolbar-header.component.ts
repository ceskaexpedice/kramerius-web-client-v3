import {Component, EventEmitter, Input, Output} from '@angular/core';

@Component({
  selector: 'app-toolbar-header',
	imports: [],
  templateUrl: './toolbar-header.component.html',
  styleUrl: './toolbar-header.component.scss'
})
export class ToolbarHeaderComponent {

  @Input() title: string = '';
  @Input() showBackButton: boolean = true;

  @Output() goBack = new EventEmitter<void>();
  @Output() titleClick = new EventEmitter<void>();

  goBackClicked() {
    this.goBack.emit();
  }

  titleClicked() {
    this.titleClick.emit();
  }

}
