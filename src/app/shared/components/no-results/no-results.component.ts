import { Component, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { ENVIRONMENT } from '../../../app.config';

@Component({
  selector: 'app-no-results',
  imports: [TranslatePipe],
  templateUrl: './no-results.component.html',
  styleUrl: './no-results.component.scss'
})
export class NoResultsComponent {
  /** Submitted search term; when empty (e.g. only filters are active) the title omits it. */
  term = input<string | null | undefined>('');
  public contactEmail = ENVIRONMENT.contactEmail;
}
