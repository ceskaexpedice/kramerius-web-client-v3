import {Component, inject, ViewChild, AfterViewInit, OnInit, OnDestroy, ElementRef} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {SearchService} from '../../../../shared/services/search.service';
import {AutocompleteComponent} from '../../../../shared/components/autocomplete/autocomplete.component';
import {TranslatePipe} from '@ngx-translate/core';
import {AdvancedSearchService} from '../../../../shared/services/advanced-search.service';
import {ConfigService} from '../../../../core/config/config.service';
import {NgIf} from '@angular/common';
import {
  SuggestedSearchTagsSectionComponent
} from '../suggested-search-tags-section/suggested-search-tags-section.component';
import {UiStateService} from '../../../../shared/services/ui-state.service';
import {BreakpointService} from '../../../../shared/services/breakpoint.service';

@Component({
  selector: 'app-search-hero',
  imports: [
    FormsModule,
    AutocompleteComponent,
    TranslatePipe,
    SuggestedSearchTagsSectionComponent,
    NgIf,
  ],
  templateUrl: './search-hero.component.html',
  styleUrl: './search-hero.component.scss'
})

export class SearchHeroComponent implements AfterViewInit, OnInit, OnDestroy {

  searchService = inject(SearchService);
  advancedSearch = inject(AdvancedSearchService);
  private configService = inject(ConfigService);
  private uiState = inject(UiStateService);
  private el = inject(ElementRef);

  breakpointService = inject(BreakpointService);

  heroTitle = '';
  showSuggestedTags = this.configService.suggestedTags.length > 0;

  @ViewChild(AutocompleteComponent) autocompleteComponent!: AutocompleteComponent;

  private intersectionObserver?: IntersectionObserver;

  async ngOnInit() {
    const activeLib = await this.configService.getActiveLibrary();
    if (activeLib) {
      this.heroTitle = activeLib.name;
    }
  }

  ngAfterViewInit() {
    this.intersectionObserver = new IntersectionObserver(
      ([entry]) => this.uiState.searchHeroVisible.set(entry.isIntersecting),
      { threshold: 0 }
    );
    this.intersectionObserver.observe(this.el.nativeElement);

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

  ngOnDestroy() {
    this.intersectionObserver?.disconnect();
    this.uiState.searchHeroVisible.set(true);
  }

  openAdvancedSearch() {
    this.advancedSearch.openDialog();
  }

}
