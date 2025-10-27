import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-fullscreen',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './fullscreen.component.html',
  styleUrl: './fullscreen.component.scss'
})
export class FullscreenComponent {
  @Input() isFullscreen: boolean = false;
  @Output() closeFullscreen = new EventEmitter<void>();

  onClose(): void {
    this.closeFullscreen.emit();
  }
}
