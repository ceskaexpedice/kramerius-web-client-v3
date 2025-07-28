import {Component, ElementRef, Input, ViewChild} from '@angular/core';
import {NgClass, NgIf} from '@angular/common';

@Component({
  selector: 'app-carousel',
  imports: [
    NgClass,
  ],
  templateUrl: './carousel.component.html',
  styleUrl: './carousel.component.scss'
})
export class CarouselComponent {

  canScrollLeft = false;
  canScrollRight = true;

  @ViewChild('scrollContainer', { static: true }) scrollContainer!: ElementRef<HTMLDivElement>;

  @Input() edgeToEdge = false;


  scrollLeft() {
    const firstItem = this.scrollContainer.nativeElement.querySelector('.record-item-card');
    if (firstItem) {
      const scrollAmount = firstItem.clientWidth + 16; // +gap
      this.scrollContainer.nativeElement.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    }

    this.checkScrollState();
  }

  scrollRight() {
    const firstItem = this.scrollContainer.nativeElement.querySelector('.record-item-card');
    if (firstItem) {
      const scrollAmount = firstItem.clientWidth + 16; // +gap
      this.scrollContainer.nativeElement.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
    this.checkScrollState();
  }

  checkScrollState() {
    const container = this.scrollContainer.nativeElement;
    this.canScrollLeft = container.scrollLeft > 0;
    this.canScrollRight = container.scrollLeft + container.clientWidth < container.scrollWidth;
  }

}
