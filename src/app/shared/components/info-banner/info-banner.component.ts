import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatCheckboxModule } from '@angular/material/checkbox';

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
  imports: [MatCheckboxModule],
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
  /** When true, renders an X button that emits `close`. */
  @Input() closable = false;

  @Output() actionClick = new EventEmitter<string>();
  @Output() dontShowAgainChange = new EventEmitter<boolean>();
  @Output() close = new EventEmitter<void>();

  onAction(id: string): void {
    this.actionClick.emit(id);
  }

  onDontShowToggle(checked: boolean): void {
    this.dontShowAgainChange.emit(checked);
  }

  onClose(): void {
    this.close.emit();
  }
}
