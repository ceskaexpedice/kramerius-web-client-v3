import {Component, EventEmitter, Input, Output} from '@angular/core';
import {TranslatePipe} from '@ngx-translate/core';

@Component({
  selector: 'app-toolbar-header',
  imports: [
    TranslatePipe,
  ],
  templateUrl: './toolbar-header.component.html',
  styleUrl: './toolbar-header.component.scss'
})
export class ToolbarHeaderComponent {

  @Input() title: string = '';
  @Input() showBackButton: boolean = true;
  @Input() titleClickable: boolean = false;

  @Output() goBack = new EventEmitter<void>();
  @Output() titleClick = new EventEmitter<void>();

  goBackClicked() {
    this.goBack.emit();
  }

  titleClicked() {
    this.titleClick.emit();
  }

}
