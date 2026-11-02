import {Component, EventEmitter, Input, Output} from '@angular/core';
import {TranslatePipe} from '@ngx-translate/core';
import {CdkTooltipDirective} from '../../directives';

@Component({
  selector: 'app-toolbar-header',
  imports: [
    TranslatePipe,
    CdkTooltipDirective,
  ],
  templateUrl: './toolbar-header.component.html',
  styleUrl: './toolbar-header.component.scss'
})
export class ToolbarHeaderComponent {

  @Input() title: string = '';
  @Input() showBackButton: boolean = true;
  @Input() titleClickable: boolean = false;
  /** Leaves out the title (e.g. on phones, where it does not fit beside the actions). */
  @Input() hideTitle: boolean = false;

  /** Tooltip shown on the clickable title. Provide an already-translated string. */
  @Input() titleTooltip?: string;
  /** Tooltip shown on the back/home button. Provide an already-translated string. */
  @Input() backButtonTooltip?: string;

  @Output() goBack = new EventEmitter<void>();
  @Output() titleClick = new EventEmitter<void>();

  goBackClicked() {
    this.goBack.emit();
  }

  titleClicked() {
    if (!this.titleClickable) {
      return;
    }
    this.titleClick.emit();
  }

  /** Space activates the title like a button; swallow the page scroll it would otherwise cause. */
  onTitleSpace(event: Event) {
    if (!this.titleClickable) {
      return;
    }
    event.preventDefault();
    this.titleClicked();
  }

}
