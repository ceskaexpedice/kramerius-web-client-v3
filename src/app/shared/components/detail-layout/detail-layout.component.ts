import {Component, HostListener, inject, Input} from '@angular/core';
import {
  FilterSidebarComponent
} from "../../../modules/search-results-page/components/filter-sidebar/filter-sidebar.component";
import {DetailViewService} from '../../../modules/detail-view-page/services/detail-view.service';

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

  @Input() showBottomToolbar = true;

  private detailViewService = inject(DetailViewService);

  @HostListener('document:keydown', ['$event'])
  keydownHandler(event: KeyboardEvent) {
    switch (event.key) {
      case 'ArrowLeft': {
        this.detailViewService.goToPrevious();
        break;
      }
      case 'ArrowRight': {
        this.detailViewService.goToNext();
        break;
      }
      case 'ArrowUp': {
        // go -3 pages
        this.detailViewService.goToPrevious(3);
        break;
      }
      case 'ArrowDown': {
        // go +3 pages
        this.detailViewService.goToNext(3);
        break;
      }
      default: {
        // Do nothing
      }
    }
  }

}
