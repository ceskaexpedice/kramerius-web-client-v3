import {Component, effect, inject, OnInit, signal} from '@angular/core';
import {NgForOf, NgIf} from '@angular/common';
import {ReactiveFormsModule} from '@angular/forms';
import {SolrService} from '../../../core/solr/solr.service';
import {TranslatePipe} from '@ngx-translate/core';
import {SearchService} from '../../services/search.service';

@Component({
  selector: 'app-autocomplete',
  imports: [
    NgIf,
    NgForOf,
    ReactiveFormsModule,
    TranslatePipe,
  ],
  templateUrl: './autocomplete.component.html',
  styleUrl: './autocomplete.component.scss',
})
export class AutocompleteComponent implements OnInit {
  inputTerm = signal('');
  suggestions = signal<string[]>([]);
  isLoading = signal(false);

  private solrService = inject(SolrService)
  private searchService = inject(SearchService);

  constructor(
  ) {

    effect(() => {
      const term = this.inputTerm();
      if (!term || term.length < 2) {
        this.suggestions.set([]);
        return;
      }

      this.isLoading.set(true);
      const sub = this.solrService.getAutocompleteSuggestions(term).subscribe({
        next: (res: any) => {
          this.suggestions.set(res);
          this.isLoading.set(false);
        },
        error: () => this.isLoading.set(false),
      });

      return () => sub.unsubscribe();
    });

  }

  ngOnInit() {
  }

  onInputChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.inputTerm.set(input.value);
  }

  onSelectSuggestion(suggestion: string) {
    this.inputTerm.set(suggestion);

    this.search();
  }

  search() {
    const query = this.inputTerm() || '';

    this.searchService.search(query);
  }
}
