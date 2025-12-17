import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NgIf } from '@angular/common';
import { BasePopupComponent } from '../base-popup/base-popup.component';

@Component({
  selector: 'app-image-preview-popup',
  standalone: true,
  imports: [
    NgIf,
    BasePopupComponent,
  ],
  templateUrl: './image-preview-popup.component.html',
  styleUrl: './image-preview-popup.component.scss'
})
export class ImagePreviewPopupComponent {
  @Input() imageUrl: string = '';
  @Input() altText: string = '';
  @Output() close = new EventEmitter<void>();

  onClose(): void {
    this.close.emit();
  }
}
