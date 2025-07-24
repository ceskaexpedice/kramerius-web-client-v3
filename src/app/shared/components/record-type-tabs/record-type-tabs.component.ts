import {Component, EventEmitter, Input, Output} from '@angular/core';
import {NgForOf} from '@angular/common';
import {TranslatePipe} from '@ngx-translate/core';

@Component({
  selector: 'app-record-type-tabs',
  imports: [
    NgForOf,
    TranslatePipe,
  ],
  templateUrl: './record-type-tabs.component.html',
  styleUrl: './record-type-tabs.component.scss'
})
export class RecordTypeTabsComponent {

  @Input() value: string = 'all';
  @Output() valueChange = new EventEmitter<string>();

  readonly tabs = [
    { label: 'filter-all', value: 'all' },
    // { label: 'filter-images', value: 'images' },
    // { label: 'filter-periodicals', value: 'periodicals' },
    // { label: 'filter-maps', value: 'maps' }
  ];

  selectTab(value: string) {
    this.valueChange.emit(value);
  }

}
