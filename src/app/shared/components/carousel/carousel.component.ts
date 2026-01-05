import {Component, ElementRef, Input, ViewChild} from '@angular/core';
import {NgClass, NgIf, NgTemplateOutlet} from '@angular/common';
import {TranslatePipe} from '@ngx-translate/core';

@Component({
  selector: 'app-carousel',
  imports: [
    NgClass,
    NgIf,
    NgTemplateOutlet,
    TranslatePipe,
  ],
  templateUrl: './carousel.component.html',
  styleUrl: './carousel.component.scss'
})
export class CarouselComponent {

  canScrollLeft = false;
  canScrollRight = true;

  @ViewChild('scrollContainer', { static: true }) scrollContainer!: ElementRef<HTMLDivElement>;

  @Input() edgeToEdge = false;
  @Input() actionsPosition: 'top' | 'bottom' = 'bottom';


  scrollLeft() {
    const container = this.scrollContainer.nativeElement;
    const firstItem = container.querySelector('.record-item-card');
    if (firstItem) {
      const itemWidth = firstItem.clientWidth + 16; // +gap
      const visibleItemsCount = Math.floor(container.clientWidth / itemWidth);
      const scrollAmount = itemWidth * visibleItemsCount;
      container.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    }

    this.checkScrollState();
  }

  scrollRight() {
    const container = this.scrollContainer.nativeElement;
    const firstItem = container.querySelector('.record-item-card');
    if (firstItem) {
      const itemWidth = firstItem.clientWidth + 16; // +gap
      const visibleItemsCount = Math.floor(container.clientWidth / itemWidth);
      const scrollAmount = itemWidth * visibleItemsCount;
      container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
    this.checkScrollState();
  }

  checkScrollState() {
    const container = this.scrollContainer.nativeElement;
    this.canScrollLeft = container.scrollLeft > 0;
    this.canScrollRight = container.scrollLeft + container.clientWidth < container.scrollWidth;
  }

}
