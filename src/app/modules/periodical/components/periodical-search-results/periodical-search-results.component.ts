import {Component, inject} from '@angular/core';
import {AsyncPipe, NgForOf, NgIf} from '@angular/common';
import {PeriodicalService} from '../../../../shared/services/periodical.service';
import {TranslatePipe} from '@ngx-translate/core';
import {RecordItemComponent} from '../../../../shared/components/record-item/record-item.component';
import {PaginatorComponent} from '../../../../shared/components/paginator/paginator.component';
import {ResultsSortComponent} from '../../../search-results-page/components/results-sort/results-sort.component';

@Component({
  selector: 'app-periodical-search-results',
  imports: [
    NgIf,
    AsyncPipe,
    TranslatePipe,
    RecordItemComponent,
    NgForOf,
    PaginatorComponent,
    ResultsSortComponent,
  ],
  templateUrl: './periodical-search-results.component.html',
  styleUrl: './periodical-search-results.component.scss'
})
export class PeriodicalSearchResultsComponent {

  public periodicalService = inject(PeriodicalService);

}
