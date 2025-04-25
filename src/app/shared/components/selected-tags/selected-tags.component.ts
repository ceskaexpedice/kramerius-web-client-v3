import {Component, EventEmitter, Input, Output} from '@angular/core';
import {NgForOf, NgIf} from '@angular/common';
import {MatChip, MatChipsModule} from '@angular/material/chips';
import {MatButton} from '@angular/material/button';
import {TranslatePipe} from '@ngx-translate/core';

@Component({
  selector: 'app-selected-tags',
  imports: [
    NgIf,
    MatChip,
    NgForOf,
    MatButton,
    MatChipsModule,
    TranslatePipe,
  ],
  templateUrl: './selected-tags.component.html',
  styleUrl: './selected-tags.component.scss'
})
export class SelectedTagsComponent {
  @Input() items: string[] = [];
  @Input() clearButtonPosition: 'left' | 'right' = 'right';

  @Output() remove = new EventEmitter<string>();
  @Output() clearAll = new EventEmitter<void>();
}
