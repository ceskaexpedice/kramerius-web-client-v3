import {Component, Input, OnInit, OnDestroy, signal, effect, EventEmitter, Output, ViewChild} from '@angular/core';
import {NgIf} from '@angular/common';
import {ReactiveFormsModule} from '@angular/forms';
import {
  MatAutocompleteModule,
  MatAutocompleteSelectedEvent,
  MatOption,
} from '@angular/material/autocomplete';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {Observable, Subscription, debounceTime, switchMap, of} from 'rxjs';
import {InputComponent} from '../input/input.component';
import {TranslatePipe} from '@ngx-translate/core';
import {catchError} from 'rxjs/operators';

@Component({
  selector: 'app-autocomplete',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatAutocompleteModule,
    MatFormFieldModule,
    MatInputModule,
    NgIf,
    InputComponent,
    TranslatePipe,
  ],
  templateUrl: './autocomplete.component.html',
  styleUrl: './autocomplete.component.scss',
})
export class AutocompleteComponent implements OnInit, OnDestroy {
  inputTerm = signal('');
  suggestions = signal<string[]>([]);
  isLoading = signal(false);

  private justSelected = false;

  private termChangeSubject = new EventEmitter<string>();
  private subscription: Subscription | null = null;

  @Input() inputTheme: string = 'light';
  @Input() placeholder: string = '';
  @Input() minTermLength: number = 2;
  @Input() initialValue: string = '';
  @Input() debounceTime: number = 400;

  @Input() getSuggestions: (term: string) => Observable<string[]> = () => of([]);

  @Output() search = new EventEmitter<string>();
  @Output() submit = new EventEmitter<string>();
  @Output() termChange = new EventEmitter<string>();
  @Output() suggestionSelected = new EventEmitter<string>();

  constructor() {
    this.subscription = this.termChangeSubject.pipe(
      debounceTime(this.debounceTime),
      switchMap(term => {
        if (!term || term.length < this.minTermLength) {
          return of([]);
        }

        if (this.justSelected) {
          this.justSelected = false;
          return of(this.suggestions());
        }

        this.isLoading.set(true);

        // Use catchError to handle API errors without terminating the stream
        return this.getSuggestions(term).pipe(
          catchError(err => {
            console.error('Error fetching suggestions:', err);
            return of([]); // Return empty array but keep the stream alive
          })
        );
      })
    ).subscribe({
      next: (suggestions: string[]) => {
        this.suggestions.set(suggestions);
        this.isLoading.set(false);
      }
    });

    effect(() => {
      const term = this.inputTerm();
      this.termChange.emit(term);

      if (!this.justSelected) {
        this.termChangeSubject.emit(term);
      }
    });
  }

  ngOnInit() {
    if (this.initialValue) {
      this.inputTerm.set(this.initialValue);
    }
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  onInputValueChange(value: string) {
    this.inputTerm.set(value);
  }

  onSelectSuggestion(event: MatAutocompleteSelectedEvent) {
    const option: MatOption = event.option;
    const value = option.value;

    this.justSelected = true;

    this.inputTerm.set(value);
    this.suggestionSelected.emit(value);
  }

  onSearch() {
    this.search.emit(this.inputTerm());
  }

  onSubmit() {
    this.submit.emit(this.inputTerm());
  }
}
