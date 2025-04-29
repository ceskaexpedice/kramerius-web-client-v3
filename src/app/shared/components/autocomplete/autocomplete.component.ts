import {Component, inject, Input, OnInit, signal, effect} from '@angular/core';
import {NgClass} from '@angular/common';
import {ReactiveFormsModule} from '@angular/forms';
import {SolrService} from '../../../core/solr/solr.service';
import {TranslatePipe} from '@ngx-translate/core';
import {SearchService} from '../../services/search.service';
import {MatAutocompleteModule, MatAutocompleteSelectedEvent, MatOption} from '@angular/material/autocomplete';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';

@Component({
  selector: 'app-autocomplete',
  standalone: true,
  imports: [
    NgClass,
    ReactiveFormsModule,
    TranslatePipe,
    MatAutocompleteModule,
    MatFormFieldModule,
    MatInputModule
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

  @Input('inputTheme') inputTheme: string = 'light';

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

  onSelectSuggestion(event: MatAutocompleteSelectedEvent) {
    const option: MatOption = event.option;
    const value = option.value;

    this.inputTerm.set(value);

    this.search();
  }

  search() {
    const query = this.inputTerm() ? `titles.search:${this.inputTerm()}` : '';

    this.searchService.search(query);
  }
}
