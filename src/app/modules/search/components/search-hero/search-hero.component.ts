import {Component, inject, ViewChild, AfterViewInit, OnInit} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {SearchService} from '../../../../shared/services/search.service';
import {AutocompleteComponent} from '../../../../shared/components/autocomplete/autocomplete.component';
import {TranslatePipe} from '@ngx-translate/core';
import {AdvancedSearchService} from '../../../../shared/services/advanced-search.service';
import {ConfigService} from '../../../../core/config/config.service';
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

export class SearchHeroComponent implements AfterViewInit, OnInit {

  searchService = inject(SearchService);
  advancedSearch = inject(AdvancedSearchService);
  private configService = inject(ConfigService);

  heroTitle = '';

  @ViewChild(AutocompleteComponent) autocompleteComponent!: AutocompleteComponent;

  async ngOnInit() {
    const activeLib = await this.configService.getActiveLibrary();
    if (activeLib) {
      this.heroTitle = activeLib.name;
    }
  }

  ngAfterViewInit() {
    // Focus the autocomplete input after view initialization
    setTimeout(() => {
      const inputComponent = this.autocompleteComponent?.inputComponent;
      const autocompleteTrigger = inputComponent?.autocompleteTrigger;
      const inputElement = inputComponent?.inputElement?.nativeElement;

      if (inputElement) {
        // Focus the input
        inputElement.focus();

        // Close the autocomplete panel if it opened
        if (autocompleteTrigger) {
          setTimeout(() => {
            autocompleteTrigger.closePanel();
          }, 0);
        }
      }
    }, 20);
  }

  openAdvancedSearch() {
    this.advancedSearch.openDialog();
  }

}
