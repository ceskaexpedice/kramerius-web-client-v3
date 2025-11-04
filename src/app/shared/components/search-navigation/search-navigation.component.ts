import { Component, Input, Output, EventEmitter } from '@angular/core';
import { NgIf } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-search-navigation',
  standalone: true,
  imports: [NgIf, TranslateModule],
  templateUrl: './search-navigation.component.html',
  styleUrl: './search-navigation.component.scss'
})
export class SearchNavigationComponent {
  @Input() currentMatchNumber: number = 0;
  @Input() totalMatches: number = 0;
  @Input() isSearching: boolean = false;

  @Output() previousMatch = new EventEmitter<void>();
  @Output() nextMatch = new EventEmitter<void>();

  onPreviousClick(): void {
    this.previousMatch.emit();
  }

  onNextClick(): void {
    this.nextMatch.emit();
  }
}
