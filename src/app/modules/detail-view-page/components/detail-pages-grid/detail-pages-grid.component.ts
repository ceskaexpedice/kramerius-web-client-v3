import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  Input,
  OnDestroy,
  signal,
  ViewChild,
} from '@angular/core';
import { NgClass, NgIf } from '@angular/common';
import { CdkVirtualScrollViewport, ScrollingModule } from '@angular/cdk/scrolling';
import { toSignal } from '@angular/core/rxjs-interop';
import { DetailPageItemComponent } from '../detail-page-item/detail-page-item.component';
import { DetailViewService } from '../../services/detail-view.service';
import { Page } from '../../../../shared/models/page.model';
import { uiZoom } from '../../../../shared/utils/ui-zoom';

@Component({
  selector: 'app-detail-pages-grid',
  imports: [
    NgIf,
    NgClass,
    ScrollingModule,
    DetailPageItemComponent,
  ],
  templateUrl: './detail-pages-grid.component.html',
  styleUrl: './detail-pages-grid.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DetailPagesGridComponent implements AfterViewInit, OnDestroy {
  public detailViewService = inject(DetailViewService);

  @ViewChild(CdkVirtualScrollViewport) viewport?: CdkVirtualScrollViewport;
  @ViewChild('gridMeasure') gridMeasure?: ElementRef<HTMLElement>;

  /**
   * Signal-backed so `pages()`/`rows()` recompute if the grid is reused for a
   * different type (a plain @Input field read inside a computed would go stale).
   */
  private readonly typeSignal = signal<'recording' | 'page'>('page');

  @Input()
  set type(value: 'recording' | 'page') {
    this.typeSignal.set(value);
  }
  get type(): 'recording' | 'page' {
    return this.typeSignal();
  }

  /** Columns per row — must match the grid-template-columns in the SCSS. */
  private static readonly COLUMNS: Record<'recording' | 'page', number> = { page: 3, recording: 2 };

  /** Row gap in px — must match the `gap` in the SCSS. */
  private static readonly GAP = 8;

  /**
   * Fallback row height used before the first measurement lands. Only affects
   * the very first frame; a ResizeObserver replaces it with the real value.
   */
  private static readonly FALLBACK_ROW_HEIGHT = 160;

  private allPages = toSignal(this.detailViewService.pages$, { initialValue: null });
  private onlyPages = toSignal(this.detailViewService.pagesOnly$, { initialValue: null });

  /** Measured height of one grid row (cell height + gap), kept live by a ResizeObserver. */
  rowHeight = signal(DetailPagesGridComponent.FALLBACK_ROW_HEIGHT);

  private resizeObserver?: ResizeObserver;

  /** Flat page list for the current `type`, with recording filtering applied. */
  pages = computed<Page[] | null>(() => {
    const source = this.type === 'recording' ? this.allPages() : this.onlyPages();
    if (!source) return null;
    return this.type === 'recording' ? this.detailViewService.filterJpegPages(source) : source;
  });

  /** Pages chunked into rows — the unit cdkVirtualFor virtualizes. */
  rows = computed<Page[][]>(() => {
    const pages = this.pages();
    if (!pages?.length) return [];
    const columns = DetailPagesGridComponent.COLUMNS[this.type];
    const rows: Page[][] = [];
    for (let i = 0; i < pages.length; i += columns) {
      rows.push(pages.slice(i, i + columns));
    }
    return rows;
  });

  constructor() {
    effect(() => {
      // Track the active page and the row list so the scroll re-runs when either
      // changes (e.g. pages arrive after the current index was already set).
      this.detailViewService.currentPageIndex;
      this.rows();
      queueMicrotask(() => this.scrollToActivePage());
    });
  }

  ngAfterViewInit(): void {
    const grid = this.gridMeasure?.nativeElement;
    if (!grid || typeof ResizeObserver === 'undefined') return;

    // Cells are sized by aspect-ratio, so their height follows the sidebar
    // width. Measure a real cell instead of hardcoding an itemSize, and keep it
    // current across sidebar resizes and orientation changes.
    this.resizeObserver = new ResizeObserver(() => this.measureRowHeight());
    this.resizeObserver.observe(grid);
    this.measureRowHeight();
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
  }

  private measureRowHeight(): void {
    // Measure a cell, not the row: the row's height is pinned to rowHeight()
    // itself. (Measuring the row, whose padding already held the gap, and
    // adding GAP again made itemSize 8px taller than a row: the rows drifted
    // from their virtual offsets and the grid jumped while scrolling.)
    const cell = this.gridMeasure?.nativeElement.querySelector('.page--grid__row > *') as HTMLElement | null;
    // Virtual-scroll item sizes are CSS px; the rect is visual px under UI zoom.
    const height = cell ? cell.getBoundingClientRect().height / uiZoom() : 0;
    if (!height) return;

    const next = Math.ceil(height) + DetailPagesGridComponent.GAP;
    if (next > 0 && next !== this.rowHeight()) {
      this.rowHeight.set(next);
    }
  }

  trackByRow = (index: number, row: Page[]): string => row[0]?.pid ?? `${index}`;

  clickedPage(pid: string) {
    this.detailViewService.navigateToPage(pid);
  }

  scrollToActivePage() {
    const currentPid = this.detailViewService.currentPagePid;
    if (!currentPid || !this.viewport) return;

    const columns = DetailPagesGridComponent.COLUMNS[this.type];
    const index = this.pages()?.findIndex(p => p.pid === currentPid) ?? -1;
    if (index === -1) return;

    const rowIndex = Math.floor(index / columns);

    // Only scroll when the row is outside the rendered range — scrolling on
    // every page change would fight the user's own scrolling.
    const range = this.viewport.getRenderedRange();
    if (rowIndex >= range.start && rowIndex < range.end) return;

    this.viewport.scrollToIndex(Math.max(0, rowIndex), 'smooth');
  }
}
