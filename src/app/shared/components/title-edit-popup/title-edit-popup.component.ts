import {Component, EventEmitter, Input, Output, signal, OnInit} from '@angular/core';
import {BasePopupComponent} from '../base-popup/base-popup.component';
import {InputComponent} from '../input/input.component';
import {TranslatePipe} from '@ngx-translate/core';

@Component({
  selector: 'app-title-edit-popup',
  standalone: true,
  imports: [
    BasePopupComponent,
    InputComponent,
    TranslatePipe
  ],
  template: `
    <app-base-popup
      [title]="'edit-title' | translate"
      [width]="'300px'"
      [confirmDisabled]="!currentTitle().trim()"
      (cancel)="onCancel()"
      (confirm)="onConfirm()">
      
      <app-input
        [theme]="'dark'"
        [size]="'sm'"
        [type]="'text'"
        [label]="'title-label' | translate"
        [placeholder]="'enter-new-title' | translate"
        [signalInput]="currentTitle"
        (enter)="onConfirm()"
      />
      
    </app-base-popup>
  `,
  styles: ``
})
export class TitleEditPopupComponent implements OnInit {
  @Input() initialTitle: string = '';
  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<string>();

  currentTitle = signal('');

  ngOnInit() {
    this.currentTitle.set(this.initialTitle);
  }

  onCancel() {
    this.close.emit();
  }

  onConfirm() {
    const trimmedTitle = this.currentTitle().trim();
    if (trimmedTitle) {
      this.save.emit(trimmedTitle);
    }
  }
}