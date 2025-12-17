import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-preview-navigation-bar',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './preview-navigation-bar.component.html',
  styleUrl: './preview-navigation-bar.component.scss'
})
export class PreviewNavigationBarComponent {
  @Input() currentIndex: number = 1;
  @Input() totalItems: number = 1;

  @Output() previous = new EventEmitter<void>();
  @Output() next = new EventEmitter<void>();
  @Output() close = new EventEmitter<void>();

  get hasPrevious(): boolean {
    return this.currentIndex > 1;
  }

  get hasNext(): boolean {
    return this.currentIndex < this.totalItems;
  }

  onPrevious(): void {
    if (this.hasPrevious) {
      this.previous.emit();
    }
  }

  onNext(): void {
    if (this.hasNext) {
      this.next.emit();
    }
  }

  onClose(): void {
    this.close.emit();
  }
}
