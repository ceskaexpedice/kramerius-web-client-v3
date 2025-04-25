import { Component, EventEmitter, Input, Output } from '@angular/core';
import {TranslatePipe} from '@ngx-translate/core';
import {NgForOf} from '@angular/common';

@Component({
  selector: 'app-category-filter',
  imports: [
    TranslatePipe,
    NgForOf,
  ],
  templateUrl: './category-filter.component.html',
  styleUrl: './category-filter.component.scss'
})
export class CategoryFilterComponent {

  @Input() value: string = 'all';
  @Output() valueChange = new EventEmitter<string>();

  readonly tabs = [
    { label: 'Vše', value: 'all' },
    { label: 'Obrázky', value: 'images' },
    { label: 'Periodika', value: 'periodicals' }
  ];

  selectTab(value: string) {
    this.valueChange.emit(value);
  }

}
