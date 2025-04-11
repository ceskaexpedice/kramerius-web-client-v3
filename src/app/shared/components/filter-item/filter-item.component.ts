import { Component, Input, Output, EventEmitter } from '@angular/core';
import {MatCheckbox} from '@angular/material/checkbox';

@Component({
  selector: 'app-filter-item',
  imports: [
    MatCheckbox,
  ],
  templateUrl: './filter-item.component.html',
  styleUrl: './filter-item.component.scss'
})
export class FilterItemComponent {

  @Input() label!: string;
  @Input() truncateLabel: boolean = true;
  @Input() count!: number;
  @Input() checked = false;
  @Input() disabled = false;
  @Output() toggled = new EventEmitter<void>();

}
