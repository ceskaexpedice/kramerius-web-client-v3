import { Component, EventEmitter, Input, Output } from '@angular/core';

export interface InfoBannerAction {
  id: string;
  label: string;
  icon?: string;
  /** Button classes from public/styles/_buttons.scss, e.g. 'primary' | 'outlined light'. */
  style?: string;
}

@Component({
  selector: 'app-info-banner',
  standalone: true,
  imports: [],
  templateUrl: './info-banner.component.html',
  styleUrl: './info-banner.component.scss',
})
export class InfoBannerComponent {
  @Input() icon = '';
  @Input() variant: 'primary' | 'light' | 'success' = 'primary';
  @Input() title = '';
  @Input() message = '';
  @Input() actions: InfoBannerAction[] = [];
  /** When set, renders the "don't show again" checkbox. */
  @Input() dontShowId?: string;
  /** Initial checked state of the don't-show checkbox. */
  @Input() dontShowChecked = false;

  @Output() actionClick = new EventEmitter<string>();
  @Output() dontShowAgainChange = new EventEmitter<boolean>();

  onAction(id: string): void {
    this.actionClick.emit(id);
  }

  onDontShowToggle(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.dontShowAgainChange.emit(checked);
  }
}
