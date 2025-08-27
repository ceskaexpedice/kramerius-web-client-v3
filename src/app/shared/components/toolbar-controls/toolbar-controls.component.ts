import {Component, EventEmitter, Input, Output} from '@angular/core';
import {NgForOf, NgIf} from '@angular/common';
import {TranslatePipe} from '@ngx-translate/core';

export type CalendarGridControl = 'calendar' | 'grid';
export type SoundRecordGridControl = 'records' | 'images';

export interface ViewToggleOption {
  label: string;
  icon: string;
  value: string;
}

@Component({
  selector: 'app-toolbar-controls',
  imports: [
    NgIf,
    NgForOf,
    TranslatePipe,
  ],
  templateUrl: './toolbar-controls.component.html',
  styleUrl: './toolbar-controls.component.scss'
})
export class ToolbarControlsComponent {

  @Input() showViewToggle = false;
  @Input() viewToggleOptions: ViewToggleOption[] = [];
  @Input() activeViewValue: string | null = null;

  @Input() showFavorites = false;
  @Input() showShare = false;
  @Input() showQuote = false;
  @Input() showInfo = false;
  @Input() showDelete = false;
  @Input() showDownload = false;

  @Output() favoritesClicked: EventEmitter<any> = new EventEmitter<any>();
  @Output() shareClicked: EventEmitter<any> = new EventEmitter<any>();
  @Output() quoteClicked: EventEmitter<any> = new EventEmitter<any>();
  @Output() infoClicked: EventEmitter<any> = new EventEmitter<any>();
  @Output() deleteClicked: EventEmitter<any> = new EventEmitter<any>();
  @Output() downloadClicked: EventEmitter<any> = new EventEmitter<any>();
  @Output() viewChanged = new EventEmitter<string>();

  onToggle(option: ViewToggleOption): void {
    this.activeViewValue = option.value;
    this.viewChanged.emit(option.value);
  }

  onFavorite() {
    this.favoritesClicked.emit();
  }

  onShare() {
    this.shareClicked.emit();
  }

  onQuote() {
    this.quoteClicked.emit();
  }

  onInfo() {
    this.infoClicked.emit();
  }

  onDelete() {
    this.deleteClicked.emit();
  }

  onDownload() {
    this.downloadClicked.emit();
  }

}
