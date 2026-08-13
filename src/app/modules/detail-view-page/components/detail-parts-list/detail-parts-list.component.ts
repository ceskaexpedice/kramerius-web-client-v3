import { Component, ElementRef, QueryList, ViewChildren, effect, inject } from '@angular/core';
import { DetailViewService } from '../../services/detail-view.service';

/**
 * Sidebar list of the works bound in a convolute ("parts").
 *
 * The reader holds every bound work's pages as one continuous sequence, so this
 * list is what lets the user jump between the works — clicking a part scrolls
 * the reader to that work's first page.
 */
@Component({
  selector: 'app-detail-parts-list',
  standalone: true,
  imports: [],
  templateUrl: './detail-parts-list.component.html',
  styleUrl: './detail-parts-list.component.scss'
})
export class DetailPartsListComponent {
  public detailViewService = inject(DetailViewService);

  @ViewChildren('partItem', { read: ElementRef })
  partItems!: QueryList<ElementRef>;

  constructor() {
    effect(() => {
      // Re-run whenever the reader moves into a different part.
      this.detailViewService.currentConvolutePartIndex();
      queueMicrotask(() => this.scrollToActivePart());
    });
  }

  clickedPart(index: number): void {
    this.detailViewService.goToConvolutePart(index);
  }

  private scrollToActivePart(): void {
    const index = this.detailViewService.currentConvolutePartIndex();
    if (index < 0) {
      return;
    }
    const el = this.partItems?.get(index)?.nativeElement as HTMLElement | undefined;
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
  }
}
