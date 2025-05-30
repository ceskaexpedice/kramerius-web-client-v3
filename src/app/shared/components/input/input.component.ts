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

  @Input() type: string = 'text';
  @Input() min?: number;
  @Input() max?: number;
  @Input() readonly: boolean = false;
  @Input() required: boolean = false;
  @Input() name?: string;
  @Input() id?: string;
  @Input() pattern?: string;
  @Input() withIcons: boolean = true;
  @Input() prefix?: string;

  @Input() theme: string = 'light';
  @Input() placeholder: string = '';
  @Input() initialValue: string | number = '';
  @Input() autocomplete: MatAutocomplete | null = null;
  @Input() signalInput?: WritableSignal<string | number>;

  @Input() showMicButton: boolean = false;
  @Input() showHelpButton: boolean = false;
  @Input() showSubmitButton: boolean = false;
  @Input() submitIcon: string = 'icon-search-normal';
  @Input() changeMicToClearOnFocus: boolean = true;

  @Output() valueChange = new EventEmitter<string | number>();
  @Output() enter = new EventEmitter<string | number>();
  @Output() submit = new EventEmitter<string | number>();

  @ViewChild('inputElement', { static: true }) inputElement!: ElementRef<HTMLInputElement>;
  @ViewChild('inputModel', { static: true }) inputModel!: NgModel;

  value: string | number = '';
  isFocused = false;

  private envInjector = inject(EnvironmentInjector);

  @ViewChild(MatAutocompleteTrigger) autocompleteTrigger!: MatAutocompleteTrigger;

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    if (this.initialValue !== undefined) {
      this.value = this.castValue(this.initialValue);
    }
  }

  ngAfterViewInit(): void {
    if (this.signalInput) {
      runInInjectionContext(this.envInjector, () => {
        effect(() => {
          const newValue = this.signalInput!();
          const castedValue = this.castValue(newValue);
          if (this.value !== castedValue) {
            this.value = castedValue;
            this.inputModel?.control?.setValue(castedValue, { emitEvent: false });
            this.cdr.detectChanges();
          }
        });
      });
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
    const casted = this.castValue(val);
    this.value = casted;
    this.valueChange.emit(casted);
    this.signalInput?.set(casted as any);
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
    const val = this.value;
    const hasValue =
      typeof val === 'string' ? val.trim().length > 0 :
        typeof val === 'number' ? true : false;

    return this.changeMicToClearOnFocus && this.isFocused && this.showMicButton && hasValue;
  }

  get showMicButtonActual(): boolean {
    return this.showMicButton && !this.showClearButton;
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

}
