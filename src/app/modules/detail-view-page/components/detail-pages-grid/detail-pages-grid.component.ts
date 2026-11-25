import {
  afterEveryRender,
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
import { NgClass } from '@angular/common';
import { CdkVirtualScrollViewport, ScrollingModule } from '@angular/cdk/scrolling';
import { toSignal } from '@angular/core/rxjs-interop';
import { DetailPageItemComponent } from '../detail-page-item/detail-page-item.component';
import { DetailViewService } from '../../services/detail-view.service';
import { BreakpointService } from '../../../../shared/services/breakpoint.service';
import { Page } from '../../../../shared/models/page.model';
import { uiZoom } from '../../../../shared/utils/ui-zoom';

@Component({
  selector: 'app-detail-pages-grid',
  imports: [
    NgClass,
    ScrollingModule,
    DetailPageItemComponent,
  ],
  templateUrl: './detail-pages-grid.component.html',
  styleUrl: './detail-pages-grid.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DetailPagesGridComponent implements OnDestroy {
  public detailViewService = inject(DetailViewService);
  private breakpointService = inject(BreakpointService);

  private _viewport?: CdkVirtualScrollViewport;

  /**
   * The viewport only exists while there are pages (it sits inside an @if), so
   * the ResizeObserver is (re)attached whenever it appears.
   */
  @ViewChild(CdkVirtualScrollViewport)
  set viewport(viewport: CdkVirtualScrollViewport | undefined) {
    if (viewport === this._viewport) return;
    this._viewport = viewport;
    this.observeViewport(viewport);
  }
  get viewport(): CdkVirtualScrollViewport | undefined {
    return this._viewport;
  }

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

  /** Row to jump to (without animation) once the viewport can scroll; see applyPendingScroll(). */
  private pendingScrollRow: number | null = null;

  /** Whether the viewport has ever had a size, to tell a re-attach from the first layout. */
  private viewportShown = false;
  private viewportDetached = false;

  /** Flat page list for the current `type`, with recording filtering applied. */
  pages = computed<Page[] | null>(() => {
    const source = this.type === 'recording' ? this.allPages() : this.onlyPages();
    if (!source) return null;
    return this.type === 'recording' ? this.detailViewService.filterJpegPages(source) : source;
  });

  /**
   * Page PIDs in order. The store hands out a new pages array on unrelated
   * document-detail updates (e.g. switching articles); comparing by content
   * keeps those from re-running the scroll effect and pulling the grid back
   * to the active page while the user browses elsewhere.
   */
  private pageIds = computed<string[]>(
    () => this.pages()?.map(p => p.pid) ?? [],
    { equal: (a, b) => a.length === b.length && a.every((pid, i) => pid === b[i]) },
  );

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
      // Track the active page and the page list so the scroll re-runs when
      // either changes (e.g. pages arrive after the current index was set).
      this.detailViewService.currentPageIndex;
      this.pageIds();
      queueMicrotask(() => this.scrollToActivePage());
    });

    afterEveryRender(() => this.applyPendingScroll());
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
  }

  /**
   * Cells are sized by aspect-ratio, so their height follows the sidebar
   * width. Observing the grid catches the first rendered rows and width
   * changes; observing the viewport catches it being detached and re-attached
   * (the mobile panel moves it through a portal).
   */
  private observeViewport(viewport: CdkVirtualScrollViewport | undefined): void {
    this.resizeObserver?.disconnect();
    this.resizeObserver = undefined;
    this.viewportShown = false;
    this.viewportDetached = false;
    if (!viewport || typeof ResizeObserver === 'undefined') return;

    const element = viewport.elementRef.nativeElement;
    this.resizeObserver = new ResizeObserver(() => this.onResize());
    this.resizeObserver.observe(element);
    const grid = element.querySelector('.page--grid');
    if (grid) this.resizeObserver.observe(grid);
  }

  private onResize(): void {
    const viewport = this.viewport;
    if (!viewport) return;

    if (!this.isViewportReady(viewport)) {
      if (this.viewportShown) this.viewportDetached = true;
      return;
    }

    const element = viewport.elementRef.nativeElement;
    const previousRowHeight = this.rowHeight();
    const firstVisibleRow = Math.floor(element.scrollTop / previousRowHeight);
    this.measureRowHeight();

    if (this.viewportDetached) {
      // Re-attached: the browser reset scrollTop to 0 while the content kept
      // its old transform, so the panel showed an empty area. Re-measure and
      // land on the active page.
      this.viewportDetached = false;
      viewport.checkViewportSize();
      this.pendingScrollRow = this.activeRowIndex() ?? 0;
      this.applyPendingScroll();
    } else if (this.viewportShown && this.rowHeight() !== previousRowHeight
      && firstVisibleRow > 0 && this.pendingScrollRow === null) {
      // Row height changed (sidebar width, UI zoom): scrollTop stays in px,
      // so keep the same first row instead of drifting several rows away.
      // Applied after the new itemSize has rendered.
      this.pendingScrollRow = firstVisibleRow;
    }

    this.viewportShown = true;
  }

  /** Returns false while there is no rendered cell to measure yet. */
  private measureRowHeight(): boolean {
    // Measure a cell, not the row: the row's height is pinned to rowHeight()
    // itself. (Measuring the row, whose padding already held the gap, and
    // adding GAP again made itemSize 8px taller than a row: the rows drifted
    // from their virtual offsets and the grid jumped while scrolling.)
    const cell = this.gridMeasure?.nativeElement.querySelector('.page--grid__row > *') as HTMLElement | null;
    // Virtual-scroll item sizes are CSS px; the rect is visual px under UI zoom.
    const height = cell ? cell.getBoundingClientRect().height / uiZoom() : 0;
    if (!height) return false;

    const next = Math.ceil(height) + DetailPagesGridComponent.GAP;
    if (next !== this.rowHeight()) {
      this.rowHeight.set(next);
    }
    return true;
  }

  trackByRow = (index: number, row: Page[]): string => row[0]?.pid ?? `${index}`;

  clickedPage(pid: string) {
    this.detailViewService.navigateToPage(pid);
    this.breakpointService.closeOverlaySidebar();
  }

  /** Row of the page the viewer shows, or null if it is not in this grid. */
  private activeRowIndex(): number | null {
    const currentPid = this.detailViewService.currentPagePid;
    if (!currentPid) return null;
    const index = this.pages()?.findIndex(p => p.pid === currentPid) ?? -1;
    return index === -1 ? null : Math.floor(index / DetailPagesGridComponent.COLUMNS[this.type]);
  }

  /**
   * The viewport can only scroll once it is in the document, has a height and
   * has rendered rows. Before that (right after the pages arrive, or while the
   * mobile panel is closed) any offset is clamped to 0.
   */
  private isViewportReady(viewport: CdkVirtualScrollViewport): boolean {
    const element = viewport.elementRef.nativeElement;
    return element.isConnected && element.clientHeight > 0 && viewport.getRenderedRange().end > 0;
  }

  scrollToActivePage() {
    const rowIndex = this.activeRowIndex();
    const viewport = this.viewport;

    // Every call replaces a deferred jump, so a stale one (an earlier page or
    // document) can never win.
    if (rowIndex === null) {
      this.pendingScrollRow = null;
      return;
    }
    if (!viewport || !this.isViewportReady(viewport) || this.pendingScrollRow !== null) {
      // A deep link (?page=…) used to leave the grid stuck at the first page:
      // the jump ran before the viewport could scroll. Defer it; while a jump
      // is still pending, just retarget it so it stays instant (not a smooth
      // scroll across the whole document).
      this.pendingScrollRow = rowIndex;
      this.applyPendingScroll();
      return;
    }

    // Only scroll when the row is outside the rendered range — scrolling on
    // every page change would fight the user's own scrolling.
    const range = viewport.getRenderedRange();
    if (rowIndex >= range.start && rowIndex < range.end) return;

    viewport.scrollToIndex(rowIndex, 'smooth');
  }

  /**
   * Performs the deferred jump once the viewport can scroll and a real cell
   * exists. The offset comes from a fresh measurement: the viewport may still
   * hold the previous itemSize, which would land rows away from the target.
   */
  private applyPendingScroll(): void {
    const viewport = this.viewport;
    if (this.pendingScrollRow === null || !viewport || !this.isViewportReady(viewport)) return;
    if (!this.measureRowHeight()) return;

    const rowIndex = this.pendingScrollRow;
    this.pendingScrollRow = null;
    viewport.scrollToOffset(rowIndex * this.rowHeight());
    // Re-render the range for the current offset even when scrollTop did not
    // change (no scroll event), e.g. a re-attach landing on row 0.
    viewport.checkViewportSize();
  }
}
