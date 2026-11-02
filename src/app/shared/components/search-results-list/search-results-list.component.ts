import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  EventEmitter,
  inject,
  Input,
  OnDestroy,
  Output,
  signal,
  ViewChild,
} from '@angular/core';
import { CdkVirtualScrollViewport, ScrollingModule } from '@angular/cdk/scrolling';
import {
  DetailPageItemComponent
} from '../../../modules/detail-view-page/components/detail-page-item/detail-page-item.component';
import { DetailViewService } from '../../../modules/detail-view-page/services/detail-view.service';
import { Page } from '../../models/page.model';
import { TranslatePipe } from '@ngx-translate/core';
import { CdkTooltipDirective } from '../../directives';
import { trimSnippetToHighlight } from '../../utils/highlight-snippet';
import { uiZoom } from '../../utils/ui-zoom';

export interface SearchResult {
  pid: string;
  highlightedText: string;
  pageNumber?: string;
}

export interface DisplayItem extends SearchResult {
  page?: Page;
}

@Component({
  selector: 'app-search-results-list',
  standalone: true,
  imports: [ScrollingModule, DetailPageItemComponent, TranslatePipe, CdkTooltipDirective],
  templateUrl: './search-results-list.component.html',
  styleUrl: './search-results-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchResultsListComponent implements AfterViewInit, OnDestroy {

  /**
   * Height of one result row in px (card height + the list's row gap), measured
   * from a rendered row so a font or spacing change cannot silently desync it
   * from the SCSS.
   */
  private static readonly FALLBACK_ROW_HEIGHT = 116;

  /**
   * Inputs are signal-backed because `displayItems` is a `computed` over them.
   * It used to be a getter bound directly in the template, which re-built a Map,
   * re-allocated one object per page and re-sorted the whole array on *every*
   * change-detection pass — twice, since the template read it in both the loop
   * and the empty-state check. With `showAllPages` on a 1000-page document that
   * ran on every touchmove while the mobile panel was being dragged.
   */
  private readonly resultsSignal = signal<SearchResult[]>([]);
  private readonly currentPidSignal = signal<string | null>(null);
  private readonly showAllPagesSignal = signal(false);
  private readonly allPagesSignal = signal<Page[]>([]);

  @Input()
  set results(value: SearchResult[]) {
    this.resultsSignal.set(value ?? []);
  }
  get results(): SearchResult[] {
    return this.resultsSignal();
  }

  @Input()
  set currentPid(value: string | null) {
    this.currentPidSignal.set(value);
  }
  get currentPid(): string | null {
    return this.currentPidSignal();
  }

  @Input()
  set showAllPages(value: boolean) {
    this.showAllPagesSignal.set(value);
  }
  get showAllPages(): boolean {
    return this.showAllPagesSignal();
  }

  /**
   * `DetailViewService.pagesOnly` is a getter that filters and returns a fresh
   * array on every read, so the caller's binding hands us a new reference each
   * pass. Store by content identity (pid order) to avoid recomputing the merged
   * list when nothing actually changed.
   */
  @Input()
  set allPages(value: Page[]) {
    const next = value ?? [];
    const current = this.allPagesSignal();
    if (current.length === next.length && current.every((p, i) => p.pid === next[i].pid)) {
      return;
    }
    this.allPagesSignal.set(next);
  }
  get allPages(): Page[] {
    return this.allPagesSignal();
  }

  @Output() resultClick = new EventEmitter<SearchResult>();

  public detailViewService = inject(DetailViewService);

  @ViewChild(CdkVirtualScrollViewport) viewport?: CdkVirtualScrollViewport;
  @ViewChild('rowMeasure') rowMeasure?: ElementRef<HTMLElement>;

  rowHeight = signal(SearchResultsListComponent.FALLBACK_ROW_HEIGHT);

  private resizeObserver?: ResizeObserver;

  /**
   * The rendered list.
   * - showAllPages off: just the search hits, ordered by page number.
   * - showAllPages on: every page, with its hit's highlighted text merged in.
   */
  displayItems = computed<DisplayItem[]>(() => {
    const results = this.resultsSignal();

    if (!this.showAllPagesSignal()) {
      return this.sortByPageNumber(results.map(result => this.withTrimmedSnippet(result)));
    }

    const resultsMap = new Map<string, SearchResult>();
    results.forEach(result => resultsMap.set(result.pid, result));

    const items = this.allPagesSignal().map(page => {
      const searchResult = resultsMap.get(page.pid);
      return {
        pid: page.pid,
        highlightedText: trimSnippetToHighlight(searchResult?.highlightedText || '', SNIPPET_VISIBLE_CHARS),
        pageNumber: searchResult?.pageNumber || page['page.number'],
        page,
      };
    });

    return this.sortByPageNumber(items);
  });

  constructor() {
    // Keep the active result in view as the reader pages through the document.
    effect(() => {
      const pid = this.currentPidSignal();
      const items = this.displayItems();
      if (!pid) return;
      const index = items.findIndex(item => item.pid === pid);
      if (index === -1) return;
      queueMicrotask(() => this.scrollToIndex(index));
    });
  }

  ngAfterViewInit(): void {
    const host = this.rowMeasure?.nativeElement;
    if (!host || typeof ResizeObserver === 'undefined') return;

    this.resizeObserver = new ResizeObserver(() => this.measureRowHeight());
    this.resizeObserver.observe(host);
    this.measureRowHeight();
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
  }

  private measureRowHeight(): void {
    const row = this.rowMeasure?.nativeElement.querySelector('.search-result-item') as HTMLElement | null;
    // Virtual-scroll item sizes are CSS px; the rect is visual px under UI zoom.
    const height = row ? row.getBoundingClientRect().height / uiZoom() : 0;
    if (!height) return;

    const gap = parseFloat(
      getComputedStyle(this.rowMeasure!.nativeElement).rowGap || '0',
    ) || 0;
    const next = Math.round(height + gap);
    if (next > 0 && next !== this.rowHeight()) {
      this.rowHeight.set(next);
    }
  }

  /** Scrolls only when the row is outside the rendered window, so it never fights the user. */
  private scrollToIndex(index: number): void {
    if (!this.viewport) return;
    const range = this.viewport.getRenderedRange();
    if (index >= range.start && index < range.end) return;
    this.viewport.scrollToIndex(Math.max(0, index), 'smooth');
  }

  /**
   * Re-centers the snippet on its first match. Rows are a fixed 104px and the
   * text clamps to 5 lines, so a long Solr fragment used to push the searched
   * term into the clipped overflow.
   */
  private withTrimmedSnippet<T extends { highlightedText: string }>(item: T): T {
    return { ...item, highlightedText: trimSnippetToHighlight(item.highlightedText, SNIPPET_VISIBLE_CHARS) };
  }

  private sortByPageNumber<T extends { pageNumber?: string }>(items: T[]): T[] {
    return [...items].sort((a, b) => {
      const aNum = Number(a.pageNumber);
      const bNum = Number(b.pageNumber);
      const aValid = !Number.isNaN(aNum);
      const bValid = !Number.isNaN(bNum);

      if (aValid && bValid) {
        return aNum - bNum;
      }
      if (aValid) {
        return -1;
      }
      if (bValid) {
        return 1;
      }
      return (a.pageNumber || '').localeCompare(b.pageNumber || '');
    });
  }

  onResultClick(result: DisplayItem): void {
    this.resultClick.emit(result);
  }

  isActive(result: DisplayItem): boolean {
    return result.pid === this.currentPidSignal();
  }

  trackByPid = (_index: number, item: DisplayItem): string => item.pid;
}

/**
 * What the 5-line clamp shows in a fixed-height result row. Sized from the same
 * measurement as the card's OCR box and kept a little under capacity, so the
 * match stays inside the clamp across sidebar widths and text scales.
 */
const SNIPPET_VISIBLE_CHARS = 90;
