import {Component, inject} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {SearchService} from '../../../../shared/services/search.service';
import {AutocompleteComponent} from '../../../../shared/components/autocomplete/autocomplete.component';

@Component({
  selector: 'app-search-hero',
  imports: [
    FormsModule,
    AutocompleteComponent,
  ],
  templateUrl: './search-hero.component.html',
  styleUrl: './search-hero.component.scss'
})

export class SearchHeroComponent {

  searchService = inject(SearchService)

}
