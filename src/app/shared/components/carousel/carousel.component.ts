import { Component, ElementRef, Input, ViewChild, AfterViewInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { NgClass, NgIf, NgTemplateOutlet } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';

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
export class CarouselComponent implements AfterViewInit, OnDestroy {

  canScrollLeft = false;
  canScrollRight = true;
  isScrollable = false;

  private resizeObserver: ResizeObserver | null = null;

  @ViewChild('scrollContainer', { static: true }) scrollContainer!: ElementRef<HTMLDivElement>;

  @Input() edgeToEdge = false;
  @Input() actionsPosition: 'top' | 'bottom' = 'bottom';

  constructor(private cdr: ChangeDetectorRef) { }

  ngAfterViewInit() {
    this.checkScrollState();

    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => {
        this.checkScrollState();
        this.cdr.detectChanges();
      });
      if (this.scrollContainer && this.scrollContainer.nativeElement) {
        this.resizeObserver.observe(this.scrollContainer.nativeElement);
      }
    }
  }

  ngOnDestroy() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
  }

  scrollLeft() {
    const container = this.scrollContainer.nativeElement;
    const firstItem = container.querySelector('.record-item-card, .category-item-card');
    if (firstItem) {
      const itemWidth = firstItem.clientWidth + 16; // +gap
      const visibleItemsCount = Math.floor(container.clientWidth / itemWidth);
      const scrollAmount = itemWidth * visibleItemsCount;
      container.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    }

    // Delay check to allow scroll animation to settle
    setTimeout(() => this.checkScrollState(), 350);
  }

  scrollRight() {
    const container = this.scrollContainer.nativeElement;
    const firstItem = container.querySelector('.record-item-card, .category-item-card');
    if (firstItem) {
      const itemWidth = firstItem.clientWidth + 16; // +gap
      const visibleItemsCount = Math.floor(container.clientWidth / itemWidth);
      const scrollAmount = itemWidth * visibleItemsCount;
      container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
    // Delay check to allow scroll animation to settle
    setTimeout(() => this.checkScrollState(), 350);
  }

  checkScrollState() {
    const container = this.scrollContainer.nativeElement;
    if (!container) return;

    // Use Math.ceil to prevent precision issues where scrollWidth might be a fractional pixel larger
    this.isScrollable = container.scrollWidth > Math.ceil(container.clientWidth);
    this.canScrollLeft = container.scrollLeft > 0;
    this.canScrollRight = Math.ceil(container.scrollLeft + container.clientWidth) < container.scrollWidth;
  }
}
