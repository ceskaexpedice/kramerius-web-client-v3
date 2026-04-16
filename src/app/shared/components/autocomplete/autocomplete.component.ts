import {
  Component,
  Input,
  OnInit,
  OnDestroy,
  signal,
  effect,
  EventEmitter,
  Output,
  ViewChild,
  Signal, WritableSignal, inject, computed, OnChanges, SimpleChanges, ChangeDetectorRef,
} from '@angular/core';
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
import {SearchHistoryService} from '../../services/search-history.service';

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
  suggestions = signal<string[]>([]);
  isLoading = signal(false);

  @ViewChild(InputComponent) inputComponent!: InputComponent;

  private justSelected = false;

  private termChangeSubject = new EventEmitter<string>();
  private subscription: Subscription | null = null;

  @Input() inputTheme: string = 'light';
  @Input() placeholder: string = '';
  @Input() minTermLength: number = 2;
  @Input() initialValue: string = '';
  @Input() debounceTime: number = 400;
  @Input() showMicrophoneButton: boolean = true;
  @Input() showHelpButton: boolean = true;
  @Input() showSubmitButton: boolean = true;
  @Input() showClearButton: boolean = false;
  @Input() showCaseSensitiveButton: boolean = false;
  @Input() withIcons: boolean = true;
  @Input() size: 'sm' | 'md' | 'md-lg' | 'lg' = 'md';
  @Input() showHistorySuggestions: boolean = false;
  @Input() prefixIcon = '';
  @Input() isCaseSensitive: boolean = false;
  @Input() autofocus: boolean = false;
  @Input() autoSubmit: boolean = true;

  @Input() getSuggestions: (term: string) => Observable<string[]> = () => of([]);
  @Input() inputTerm: WritableSignal<string> = signal('');

  @Output() search = new EventEmitter<string>();
  @Output() submit = new EventEmitter<string>();
  @Output() termChange = new EventEmitter<string>();
  @Output() suggestionSelected = new EventEmitter<string>();
  @Output() onCaseSensitiveEvent = new EventEmitter<void>();
  @Output() onBlurEvent = new EventEmitter<void>();
  @Output() onClearEvent = new EventEmitter<void>();

  public historyService = inject(SearchHistoryService);

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
        const term = this.inputTerm().toLowerCase();
        const unique = Array.from(new Set(suggestions));
        this.suggestions.set(this.sortSuggestions(unique, term));
        this.isLoading.set(false);
      }
    });

    effect(() => {
      const term = this.inputTerm();

      setTimeout(() => {
        this.termChange.emit(term);

        if (term === '') {
          this.justSelected = false;
        }

        if (!this.justSelected) {
          this.termChangeSubject.emit(term);
        }
      }, 5);

    });
  }

  focus(): void {
    if (this.inputComponent) {
      this.inputComponent.focus();
    } else {
      setTimeout(() => this.inputComponent?.focus(), 0);
    }
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

  filteredHistorySuggestions = computed(() => {
    const term = this.inputTerm().toLowerCase().trim();
    if (!term) return this.historyService.history();
    return this.historyService.history().filter(item =>
      item.toLowerCase().includes(term)
    );
  });

  onInputValueChange(value: string) {
    this.inputTerm.set(value);

    if (!this.showSubmitButton && this.autoSubmit) {
      this.onSubmit();
    }
  }

  onSelectSuggestion(event: MatAutocompleteSelectedEvent) {
    const option: MatOption = event.option;
    const value = option.value;

    this.justSelected = true;
    this.inputTerm.set(value);

    this.saveToHistory(value);
    this.suggestionSelected.emit(value);
  }

  onSearch() {
    this.saveToHistory(this.inputTerm());
    this.search.emit(this.inputTerm());
  }

  onSubmit() {
    this.saveToHistory(this.inputTerm());
    this.submit.emit(this.inputTerm());
  }

  onBlur() {
    this.onBlurEvent.emit();
  }

  onClearClicked() {
    this.onClearEvent.emit();
  }

  saveToHistory(term: string) {
    if (this.showHistorySuggestions) {
      this.historyService.add(term);
    }
  }

  toggledCaseSensitive() {
    this.onCaseSensitiveEvent.emit();
  }

  highlight(text: string, term: string): string {
    if (!term) return text;
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const exactRegex = new RegExp(`(${escaped})`, 'gi');
    if (exactRegex.test(text)) {
      return text.replace(exactRegex, '<span class="text-bold">$1</span>');
    }

    // Fuzzy: highlight individual words from the term
    const words = term.trim().split(/\s+/).filter(w => w.length > 0);
    if (words.length <= 1) return text;

    const wordPattern = words
      .map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('|');
    const wordRegex = new RegExp(`(${wordPattern})`, 'gi');
    return text.replace(wordRegex, '<span class="text-bold">$1</span>');
  }

  private sortSuggestions(suggestions: string[], term: string): string[] {
    if (!term) return suggestions;

    const tier1: string[] = [];
    const tier2: { s: string; index: number }[] = [];
    const tier3: string[] = [];

    for (const s of suggestions) {
      const lower = s.toLowerCase();
      if (lower.startsWith(term)) {
        tier1.push(s);
      } else if (lower.includes(term)) {
        tier2.push({ s, index: lower.indexOf(term) });
      } else {
        tier3.push(s);
      }
    }

    tier1.sort((a, b) => a.length - b.length);
    tier2.sort((a, b) => a.index - b.index);

    return [...tier1, ...tier2.map(item => item.s), ...tier3];
  }
}
