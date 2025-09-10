import {Component, EventEmitter, Input, Output} from '@angular/core';
import {NgIf} from '@angular/common';
import {TranslatePipe} from '@ngx-translate/core';

@Component({
  selector: 'app-base-popup',
  standalone: true,
  imports: [
    NgIf,
    TranslatePipe
  ],
  template: `
    <div class="base-popup" [style.width]="width">
      
      <!-- Header -->
      <div class="base-popup__header" *ngIf="title">
        <h3>{{ title | translate }}</h3>
      </div>
      
      <hr *ngIf="title">
      
      <!-- Content -->
      <div class="base-popup__content">
        <ng-content></ng-content>
      </div>
      
      <!-- Actions -->
      <div class="base-popup__actions" *ngIf="showActions">
        <div class="base-popup__actions-left">
          <ng-content select="[slot=left-actions]"></ng-content>
        </div>
        <div class="base-popup__actions-right">
          <button 
            class="button sm outlined tertiary" 
            (click)="onCancel()"
            *ngIf="showCancelButton">
            {{ cancelText | translate }}
          </button>
          <button 
            class="button primary sm" 
            [disabled]="confirmDisabled"
            (click)="onConfirm()"
            *ngIf="showConfirmButton">
            {{ confirmText | translate }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: `
    .base-popup {
      max-height: 400px;
      background: var(--color-bg-base);
      border: 1px solid var(--color-primary);
      border-radius: 8px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
      overflow: hidden;
    }

    .base-popup__header {
      padding: var(--spacing-x3) var(--spacing-x4);
    }

    .base-popup__header h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 500;
      color: var(--color-text-base);
    }

    .base-popup__content {
      padding: var(--spacing-x2) var(--spacing-x4);
    }

    .base-popup__actions {
      display: flex;
      justify-content: space-between;
      border-top: 1px solid var(--color-border-light);
      padding: 12px 16px;
    }

    .base-popup__actions-left {
      display: flex;
    }

    .base-popup__actions-right {
      display: flex;
      gap: var(--spacing-x3);
    }

    hr {
      border: none;
      height: 1px;
      background-color: var(--color-border-light);
      margin: 0;
    }
  `
})
export class BasePopupComponent {
  @Input() title: string = '';
  @Input() width: string = '265px';
  @Input() showActions: boolean = true;
  @Input() showCancelButton: boolean = true;
  @Input() showConfirmButton: boolean = true;
  @Input() cancelText: string = 'cancel';
  @Input() confirmText: string = 'done';
  @Input() confirmDisabled: boolean = false;

  @Output() cancel = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<void>();

  onCancel() {
    this.cancel.emit();
  }

  onConfirm() {
    this.confirm.emit();
  }
}