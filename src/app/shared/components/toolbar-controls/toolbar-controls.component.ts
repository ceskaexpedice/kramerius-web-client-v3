import {Component, EventEmitter, Input, Output} from '@angular/core';
import {NgIf} from '@angular/common';

export type CalendarGridControl = 'calendar' | 'grid';

@Component({
  selector: 'app-toolbar-controls',
  imports: [
    NgIf,
  ],
  templateUrl: './toolbar-controls.component.html',
  styleUrl: './toolbar-controls.component.scss'
})
export class ToolbarControlsComponent {

  @Input() showCalendarGridControls = false;
  @Input() activeCalendarGridControl: CalendarGridControl = 'calendar';
  @Input() showFavorites = false;
  @Input() showShare = false;
  @Input() showQuote = false;
  @Input() showInfo = false;

  @Output() favoritesClicked: EventEmitter<any> = new EventEmitter<any>();
  @Output() shareClicked: EventEmitter<any> = new EventEmitter<any>();
  @Output() quoteClicked: EventEmitter<any> = new EventEmitter<any>();
  @Output() infoClicked: EventEmitter<any> = new EventEmitter<any>();
  @Output() calendarGridClicked: EventEmitter<CalendarGridControl> = new EventEmitter<CalendarGridControl>();

  setViewMode(mode: CalendarGridControl) {
    this.activeCalendarGridControl = mode;
    this.calendarGridClicked.emit(mode);
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

}
