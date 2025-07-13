import { Component, Input } from '@angular/core';
import {
  FilterSidebarComponent
} from "../../../modules/search-results-page/components/filter-sidebar/filter-sidebar.component";

@Component({
  selector: 'app-detail-layout',
  imports: [
    FilterSidebarComponent
  ],
  templateUrl: './detail-layout.component.html',
  styleUrl: './detail-layout.component.scss'
})
export class DetailLayoutComponent {

  @Input() constrainBottomToolbar = false;

}
