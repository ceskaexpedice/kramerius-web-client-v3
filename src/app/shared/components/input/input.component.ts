import {
  Component,
  OnInit,
  EventEmitter,
  Output,
  signal,
  Input,
  ElementRef,
  ViewChild,
  WritableSignal, effect, AfterViewInit, inject, EnvironmentInjector, runInInjectionContext, ChangeDetectorRef,
} from '@angular/core';
import {NgClass, NgForOf, NgIf} from '@angular/common';
import {TranslatePipe} from '@ngx-translate/core';
import {MatAutocomplete, MatAutocompleteModule, MatAutocompleteTrigger} from '@angular/material/autocomplete';
import {FormsModule, NgModel} from '@angular/forms';

@Component({
  selector: 'app-input',
  imports: [
    NgClass,
    TranslatePipe,
    NgIf,
    MatAutocompleteModule,
    FormsModule,
  ],
  templateUrl: './input.component.html',
  styleUrl: './input.component.scss'
})
export class InputComponent implements OnInit, AfterViewInit {

  @Input() theme: string = 'light';
  @Input() placeholder: string = '';
  @Input() initialValue: string = '';
  @Input() autocomplete: MatAutocomplete | null = null;
  @Input() signalInput?: WritableSignal<string>;

  @Input() showMicButton: boolean = false;
  @Input() showHelpButton: boolean = false;
  @Input() showSubmitButton: boolean = false;
  @Input() submitIcon: string = 'icon-search-normal';
  @Input() changeMicToClearOnFocus: boolean = true;

  @Output() valueChange = new EventEmitter<string>();
  @Output() enter = new EventEmitter<string>();
  @Output() submit = new EventEmitter<string>();

  @ViewChild('inputElement', { static: true }) inputElement!: ElementRef<HTMLInputElement>;
  @ViewChild('inputModel', { static: true }) inputModel!: NgModel;

  value: string = '';
  isFocused = false;

  private envInjector = inject(EnvironmentInjector);

  @ViewChild(MatAutocompleteTrigger) autocompleteTrigger!: MatAutocompleteTrigger;

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    if (this.initialValue) {
      this.value = this.initialValue;
    }
  }

  ngAfterViewInit(): void {
    if (this.signalInput) {
      runInInjectionContext(this.envInjector, () => {
        effect(() => {
          const newValue = this.signalInput!();
          if (this.value !== newValue) {
            this.value = newValue;
            this.inputModel?.control?.setValue(newValue, { emitEvent: false });
            this.cdr.detectChanges(); // Force change detection
          }
        });
      });
    }
  }

  onInputChange(val: string) {
    this.value = val;
    this.valueChange.emit(val);
    this.signalInput?.set(val);
  }

  onFocus() {
    this.isFocused = true;
  }

  onBlur() {
    this.isFocused = false;
  }

  onEnter() {
    this.enter.emit(this.value);

    if (this.autocomplete && this.autocompleteTrigger) {
      this.autocompleteTrigger.closePanel();
    }
  }

  onSubmitClick() {
    this.submit.emit(this.value);
  }

  clearInput(e: Event) {
    e.preventDefault();
    this.value = '';
    this.valueChange.emit('');
    setTimeout(() => this.inputElement?.nativeElement?.focus(), 0);
  }

  get showClearButton(): boolean {
    return this.changeMicToClearOnFocus && this.isFocused && this.showMicButton && this.value.trim().length > 0;
  }

  get showMicButtonActual(): boolean {
    return this.showMicButton && !this.showClearButton;
  }

}
