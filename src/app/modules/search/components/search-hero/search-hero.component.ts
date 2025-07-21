import {Component, inject} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {SearchService} from '../../../../shared/services/search.service';
import {AutocompleteComponent} from '../../../../shared/components/autocomplete/autocomplete.component';
import {TranslatePipe} from '@ngx-translate/core';
import {AdvancedSearchService} from '../../../../shared/services/advanced-search.service';
import {
  SuggestedSearchTagsSectionComponent
} from '../suggested-search-tags-section/suggested-search-tags-section.component';

@Component({
  selector: 'app-search-hero',
  imports: [
    FormsModule,
    AutocompleteComponent,
    TranslatePipe,
    SuggestedSearchTagsSectionComponent,
  ],
  templateUrl: './search-hero.component.html',
  styleUrl: './search-hero.component.scss'
})

export class SearchHeroComponent {

  searchService = inject(SearchService);
  advancedSearch = inject(AdvancedSearchService);


  openAdvancedSearch() {
    this.advancedSearch.openDialog();
  }

}
