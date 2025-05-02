import {Component, OnInit, EventEmitter, Output, signal, Input, ElementRef, ViewChild} from '@angular/core';
import {NgClass, NgForOf, NgIf} from '@angular/common';
import {TranslatePipe} from '@ngx-translate/core';
import {MatAutocomplete, MatAutocompleteModule} from '@angular/material/autocomplete';
import {FormsModule} from '@angular/forms';

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
export class InputComponent implements OnInit {
  @ViewChild('inputElement') inputElement!: ElementRef<HTMLInputElement>;

  @Input() theme: string = 'light';
  @Input() placeholder: string = '';
  @Input() initialValue: string = '';
  @Input() autocomplete: MatAutocomplete | null = null;

  @Input() showMicButton: boolean = false;
  @Input() showHelpButton: boolean = false;
  @Input() showSubmitButton: boolean = false;
  @Input() submitIcon: string = 'icon-search-normal';
  @Input() changeMicToClearOnFocus: boolean = true;

  @Output() valueChange = new EventEmitter<string>();
  @Output() enter = new EventEmitter<string>();
  @Output() submit = new EventEmitter<string>();

  value: string = '';
  isFocused = false;

  ngOnInit() {
    if (this.initialValue) {
      this.value = this.initialValue;
    }
  }

  onFocus() {
    this.isFocused = true;
  }

  onBlur() {
    this.isFocused = false;
  }

  onEnter() {
    this.enter.emit(this.value);
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
    return this.changeMicToClearOnFocus && this.isFocused && this.showMicButton;
  }

  get showMicButtonActual(): boolean {
    return this.showMicButton && !this.showClearButton;
  }

}
