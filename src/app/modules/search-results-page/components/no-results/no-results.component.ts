import { Component, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { SearchService } from '../../../../shared/services/search.service';
import { ENVIRONMENT } from '../../../../app.config';

@Component({
  selector: 'app-no-results',
  imports: [TranslatePipe],
  templateUrl: './no-results.component.html',
  styleUrl: './no-results.component.scss'
})
export class NoResultsComponent {
  public searchService = inject(SearchService);
  public contactEmail = ENVIRONMENT.contactEmail;
}
