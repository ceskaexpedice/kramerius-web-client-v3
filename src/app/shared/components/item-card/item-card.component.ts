import {Component, Input} from '@angular/core';
import {NgIf} from '@angular/common';

@Component({
  selector: 'app-item-card',
  imports: [
    NgIf,
  ],
  templateUrl: './item-card.component.html',
  styleUrl: './item-card.component.scss'
})
export class ItemCardComponent {
  @Input() uuid!: string;
  @Input() title!: string;
  @Input() subtitle?: string;
  @Input() link: string | null = null;

  @Input() showFavoriteButton: boolean = true;

  toggleFavorite() {
    // Implement this method
    if (!this.showFavoriteButton) return;
  }

}
