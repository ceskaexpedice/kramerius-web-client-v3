import {Component, EventEmitter, Input, Output} from '@angular/core';
import {CheckboxComponent} from '../checkbox/checkbox.component';
import {TranslatePipe} from '@ngx-translate/core';
import {MatCheckbox} from '@angular/material/checkbox';
import {FormsModule} from '@angular/forms';
import {NgIf} from '@angular/common';

@Component({
  selector: 'app-button-toggle',
  imports: [
    CheckboxComponent,
    TranslatePipe,
    MatCheckbox,
    FormsModule,
    NgIf,
  ],
  templateUrl: './button-toggle.component.html',
  styleUrl: './button-toggle.component.scss'
})
export class ButtonToggleComponent {

  @Input() label: string = '';
  @Input() value: string = '';
  @Input() checked: boolean = false;

  @Output() toggled = new EventEmitter<boolean>();

  toggle() {
    this.checked = !this.checked;
    this.toggled.emit(this.checked);
  }

}
