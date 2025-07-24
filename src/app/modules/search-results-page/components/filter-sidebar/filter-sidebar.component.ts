import {Component, Input} from '@angular/core';
import {NgClass} from '@angular/common';

@Component({
  selector: 'app-filter-sidebar',
  imports: [
    NgClass,
  ],
  templateUrl: './filter-sidebar.component.html',
  styleUrl: './filter-sidebar.component.scss'
})
export class FilterSidebarComponent {

  @Input() padding: 'sm' | 'md' | 'lg' | '0' = 'md';

  @Input() scrollable = true;

}
