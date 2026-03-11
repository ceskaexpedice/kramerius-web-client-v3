import {
  Component,
  OnInit,
  EventEmitter,
  Output,
  Input,
  ElementRef,
  ViewChild,
  WritableSignal, effect, AfterViewInit, inject, EnvironmentInjector, runInInjectionContext, ChangeDetectorRef, OnChanges, SimpleChanges, OnDestroy,
} from '@angular/core';
import {NgClass, NgIf} from '@angular/common';
import {TranslatePipe} from '@ngx-translate/core';
import {MatAutocomplete, MatAutocompleteModule, MatAutocompleteTrigger} from '@angular/material/autocomplete';
import {FormsModule, NgModel} from '@angular/forms';
import {CdkTooltipDirective} from '../../directives';
import {SpeechRecognitionService} from '../../services/speech-recognition.service';
import {Subscription} from 'rxjs';

@Component({
  selector: 'app-input',
  imports: [
    NgClass,
    TranslatePipe,
    NgIf,
    MatAutocompleteModule,
    FormsModule,
    CdkTooltipDirective,
  ],
  templateUrl: './input.component.html',
  styleUrl: './input.component.scss'
})
export class InputComponent implements OnInit, AfterViewInit, OnDestroy {

  @Input() type: string = 'text';
  @Input() min?: number;
  @Input() max?: number;
  @Input() readonly: boolean = false;
  @Input() required: boolean = false;
  @Input() name?: string;
  @Input() id?: string;
  @Input() pattern?: string;
  @Input() withIcons: boolean = true;
  @Input() label?: string; // Label text above input
  @Input() prefix?: string;
  @Input() prefixIcon = '';
  @Input() postfixIcon = '';
  @Input() clickable = false;
  @Input() ariaLabel: string = '';

  @Input() theme: string = 'light';
  @Input() placeholder: string = '';
  @Input() initialValue: string | number = '';
  @Input() autocomplete: MatAutocomplete | null = null;
  @Input() signalInput?: WritableSignal<string | number>;
  @Input() leadingZero: boolean = false;
  @Input() size: 'sm' | 'md' | 'md-lg' | 'lg' = 'md';

  @Input() showMicButton: boolean = false;
  @Input() showHelpButton: boolean = false;
  @Input() showSubmitButton: boolean = false;
  @Input() showClearButton: boolean = false;
  @Input() submitIcon: string = 'icon-search-normal-1';
  @Input() changeMicToClearOnFocus: boolean = true;
  @Input() showNumberStepper: boolean = true;
  @Input() showCaseSensitiveButton: boolean = false;
  @Input() isCaseSensitive: boolean = false;
  @Input() autofocus: boolean = false;

  @Output() valueChange = new EventEmitter<string | number>();
  @Output() enter = new EventEmitter<string | number>();
  @Output() submit = new EventEmitter<string | number>();
  @Output() clearEmit = new EventEmitter<string | number>();
  @Output() onBlurEvent = new EventEmitter<void>();
  @Output() onCaseSensitiveEvent = new EventEmitter<void>();

  @ViewChild('inputElement', { static: false }) inputElement!: ElementRef<HTMLInputElement>;
  @ViewChild('inputModel', { static: false }) inputModel!: NgModel;

  value: string | number = '';
  isFocused = false;

  readonly speechService = inject(SpeechRecognitionService);
  private speechSub?: Subscription;

  private envInjector = inject(EnvironmentInjector);

  @ViewChild(MatAutocompleteTrigger) autocompleteTrigger!: MatAutocompleteTrigger;

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    if (this.initialValue !== undefined) {

      if (this.leadingZero && this.type === 'number') {
        this.initialValue = this.formatWithLeadingZero(Number(this.initialValue));
      }

      this.value = this.initialValue;
    }
  }

  focus(): void {
    setTimeout(() => this.inputElement?.nativeElement?.focus(), 0);
  }

  ngAfterViewInit(): void {
    if (this.signalInput) {
      runInInjectionContext(this.envInjector, () => {
        effect(() => {
          const newValue = this.signalInput!();
          const castedValue = this.castValue(newValue);

          if (this.value !== castedValue) {
            Promise.resolve().then(() => {
              this.value = castedValue;
              this.inputModel?.control?.setValue(castedValue, { emitEvent: false });
              this.cdr.detectChanges();
            });
          }
        });
      });
    }

    // Programmatically focus the input if autofocus is enabled
    if (this.autofocus) {
      setTimeout(() => {
        this.inputElement?.nativeElement?.focus();
      }, 0);
    }
  }

  private castValue(val: any): string | number {
    if (this.type === 'number') {
      const num = Number(val);
      return isNaN(num) ? '' : num;
    }
    return val ?? '';
  }

  onInputChange(val: any) {
    let casted = this.castValue(val);

    if (this.type === 'number' && !this.prefix && this.leadingZero) {
      casted = this.formatWithLeadingZero(Number(casted));
    }

    this.value = casted;
    this.valueChange.emit(casted);
    this.signalInput?.set(casted as any);
  }

  onFocus() {
    this.isFocused = true;
  }

  onBlur() {
    this.isFocused = false;
    this.onBlurEvent.emit();
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
    this.clearEmit.emit('');
  }

  get showClear(): boolean {
    const val = this.value;
    const hasValue =
      typeof val === 'string' ? val.trim().length > 0 :
        typeof val === 'number' ? true : false;

    if (this.showClearButton && hasValue) {
      return true;
    }

    return this.changeMicToClearOnFocus && this.isFocused && this.showMicButton && hasValue;
  }

  get showMicButtonActual(): boolean {
    return this.showMicButton && !this.showClear;
  }

  toggleCaseSensitive() {
    this.onCaseSensitiveEvent.emit();
  }

  toggleDictation() {
    this.speechSub?.unsubscribe();
    this.speechSub = this.speechService.toggle().subscribe(transcript => {
      const currentValue = typeof this.value === 'string' ? this.value : '';
      const newValue = currentValue ? `${currentValue} ${transcript}` : transcript;
      this.onInputChange(newValue);
      this.cdr.detectChanges();
    });
  }

  ngOnDestroy() {
    this.speechSub?.unsubscribe();
    this.speechService.stop();
  }

  stepUp() {
    const step = 1;
    this.value = (Number(this.value) || 0) + step;
    this.onInputChange(this.value);
  }

  stepDown() {
    const step = 1;
    this.value = (Number(this.value) || 0) - step;
    this.onInputChange(this.value);
  }

  isAtMin(): boolean {
    const minVal = this.min !== undefined ? Number(this.min) : -Infinity;
    return typeof this.value === 'number' && this.value <= minVal;
  }

  isAtMax(): boolean {
    const maxVal = this.max !== undefined ? Number(this.max) : Infinity;
    return typeof this.value === 'number' && this.value >= maxVal;
  }

  private formatWithLeadingZero(val: number): string {
    return val < 10 ? `0${val}` : `${val}`;
  }

  get iconsRight(): string {
    // Calculate right position for action icons
    let right = 11; // base padding from right edge

    // Position after submit button if present
    if (this.showSubmitButton) {
      right += 55;
    }

    return `${right}px`;
  }

  get postfixIconRight(): string {
    // Calculate right position for postfix icon (start from right edge)
    let right = 12; // base margin

    // Count action icons to the right of postfix
    if (this.showMicButtonActual || this.showClear) {
      right += 32;
    }
    if (this.showHelpButton) {
      right += 32;
    }
    if (this.showCaseSensitiveButton) {
      right += 32;
    }

    // Position before submit button if present
    if (this.showSubmitButton) {
      right += 55;
    }

    return `${right}px`;
  }

  get iconsWidth(): string {
    // Calculate total width of right-side icons for input padding
    let width = 0;

    // Submit button
    if (this.showSubmitButton) {
      width += 55;
    }

    // Action icons (each 32px)
    if (this.showMicButtonActual || this.showClear) {
      width += 32;
    }
    if (this.showHelpButton) {
      width += 32;
    }
    if (this.showCaseSensitiveButton) {
      width += 32;
    }

    // Postfix icon
    if (this.postfixIcon) {
      width += 32;
    }

    // Add base padding if there are any icons
    if (width > 0) {
      width += 11;
    }

    return `${width}px`;
  }

}
