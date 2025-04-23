import {Component, effect, inject, Input, OnInit, signal} from '@angular/core';
import {NgClass, AsyncPipe} from '@angular/common';
import {FormControl, ReactiveFormsModule} from '@angular/forms';
import {SolrService} from '../../../core/solr/solr.service';
import {TranslatePipe} from '@ngx-translate/core';
import {SearchService} from '../../services/search.service';
import {MatAutocompleteModule} from '@angular/material/autocomplete';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {Observable, of, debounceTime, switchMap, startWith} from 'rxjs';

@Component({
  selector: 'app-autocomplete',
  standalone: true,
  imports: [
    NgClass,
    ReactiveFormsModule,
    TranslatePipe,
    MatAutocompleteModule,
    MatFormFieldModule,
    MatInputModule,
    AsyncPipe
  ],
  templateUrl: './autocomplete.component.html',
  styleUrl: './autocomplete.component.scss',
})
export class AutocompleteComponent implements OnInit {
  searchControl = new FormControl('');
  isLoading = signal(false);
  filteredOptions!: Observable<string[]>;

  private solrService = inject(SolrService);
  private searchService = inject(SearchService);

  @Input('inputTheme') inputTheme: string = 'light';

  ngOnInit() {
    // Setup autocomplete filtering with debounce
    this.filteredOptions = this.searchControl.valueChanges.pipe(
      startWith(''),
      debounceTime(300),
      switchMap(value => {
        const term = value || '';

        if (!term || term.length < 2) {
          return of([]);
        }

        this.isLoading.set(true);
        return this.solrService.getAutocompleteSuggestions(term).pipe(
          switchMap(suggestions => {
            this.isLoading.set(false);
            return of(suggestions);
          })
        );
      })
    );
  }

  search() {
    const query = this.searchControl.value || '';
    this.searchService.search(query);
  }

  onOptionSelected(event: any) {
    this.search();
  }
}
