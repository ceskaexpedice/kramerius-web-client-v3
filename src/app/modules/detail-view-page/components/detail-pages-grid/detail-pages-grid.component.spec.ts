import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import { DetailPagesGridComponent } from './detail-pages-grid.component';
import { DetailPageItemComponent } from '../detail-page-item/detail-page-item.component';
import { DetailViewService } from '../../services/detail-view.service';

/**
 * Stands in for the real item: same selector and inputs, but none of the
 * translate/environment/admin dependencies. What these tests measure is how
 * many of these end up in the DOM.
 */
@Component({
  selector: 'app-detail-page-item',
  standalone: true,
  template: `<div class="stub-item" style="aspect-ratio: 82.67/124;"></div>`,
})
class StubPageItemComponent {
  @Input() page: any;
  @Input() type: 'recording' | 'page' = 'page';
  @Input() pageType = '';
  @Input() pageNumber: string | number | null = null;
  @Input() isSelected = false;
  @Input() isLocked = false;
  @Input() isUnlocked = false;
  @Input() isAccessible = false;
  @Input() lockStyle: 'terminal' | 'dnntt' | 'default' = 'default';
  @Output() pageClicked = new EventEmitter<any>();
}

/**
 * Guards the virtualization of the page grid.
 *
 * A 1000-page document used to render one `app-detail-page-item` per page —
 * ~10k DOM nodes and 1000 `<img>`s that every change-detection tick then swept.
 * That made the old mobile slide-up panel stutter as it opened, since it ran
 * detectChanges() on each touchmove while the sidebar was still mounted.
 *
 * The assertions below are about *count*, not pixels: only the rows near the
 * scroll position may exist in the DOM, no matter how long the document is.
 */
describe('DetailPagesGridComponent virtualization', () => {

  const PAGE_COUNT = 1000;
  const COLUMNS = 3;

  const makePages = (count: number) =>
    Array.from({ length: count }, (_, i) => ({
      pid: `uuid:page-${i}`,
      model: 'page',
      'page.number': `${i + 1}`,
      'page.type': 'normalPage',
      'ds.img_full.mime': 'image/jpeg',
    }));

  /** Host giving the grid a bounded height, as the real sidebar does. */
  @Component({
    standalone: true,
    imports: [DetailPagesGridComponent],
    template: `
      <div class="scroll-host" style="height: 600px; width: 300px; display: flex; flex-direction: column;">
        <app-detail-pages-grid [type]="'page'"></app-detail-pages-grid>
      </div>
    `,
  })
  class HostComponent {}

  let fixture: ComponentFixture<HostComponent>;
  let pagesOnly$: BehaviorSubject<any[]>;

  beforeEach(async () => {
    pagesOnly$ = new BehaviorSubject<any[]>(makePages(PAGE_COUNT));

    const currentPageIndex = signal(0);
    const detailViewServiceStub: Partial<DetailViewService> = {
      pages$: pagesOnly$.asObservable(),
      pagesOnly$: pagesOnly$.asObservable(),
      filterJpegPages: (pages: any[]) => pages,
      isPageActiveByPid: (pid: string) => pid === 'uuid:page-0',
      isPageLocked: () => false,
      isPageUnlocked: () => false,
      isDocumentRestrictedButAccessible: (() => false) as any,
      pageLockStyle: (() => 'default') as any,
      navigateToPage: jasmine.createSpy('navigateToPage'),
    };
    Object.defineProperty(detailViewServiceStub, 'currentPagePid', {
      get: () => 'uuid:page-0',
    });
    Object.defineProperty(detailViewServiceStub, 'currentPageIndex', {
      get: () => currentPageIndex(),
    });

    await TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [
        { provide: DetailViewService, useValue: detailViewServiceStub },
      ],
    })
      // The item template pulls in translate/env/admin services that are
      // irrelevant here; the count of rendered items is what matters.
      .overrideComponent(DetailPagesGridComponent, {
        remove: { imports: [DetailPageItemComponent] },
        add: { imports: [StubPageItemComponent] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  function renderedItems(): number {
    return fixture.nativeElement.querySelectorAll('app-detail-page-item').length;
  }

  function gridInstance(): DetailPagesGridComponent {
    return fixture.debugElement.children[0].children[0].componentInstance;
  }

  /**
   * Lets the viewport measure itself and attach its embedded views. The CDK
   * measures on an animation frame and renders through its own scheduler, so a
   * synchronous detectChanges() alone leaves the range computed but unrendered.
   */
  async function settleViewport(): Promise<void> {
    fixture.detectChanges();
    gridInstance().viewport?.checkViewportSize();
    for (let i = 0; i < 3; i++) {
      await new Promise(resolve => requestAnimationFrame(() => resolve(null)));
      fixture.detectChanges();
      await fixture.whenStable();
    }
  }

  it('renders only a small window of a 1000-page document', async () => {
    await settleViewport();

    const rendered = renderedItems();

    expect(rendered).toBeGreaterThan(0);
    // The whole point: the DOM must not hold the full document. Generous upper
    // bound so buffer-size tuning does not turn into a failing test.
    expect(rendered).toBeLessThan(PAGE_COUNT / 4);
  });

  it('chunks pages into rows matching the grid column count', () => {
    const grid = gridInstance();

    const rows = grid.rows();
    expect(rows.length).toBe(Math.ceil(PAGE_COUNT / COLUMNS));
    expect(rows[0].length).toBe(COLUMNS);
    // Row contents stay in document order across the chunk boundary.
    expect(rows[0].map(p => p.pid)).toEqual(['uuid:page-0', 'uuid:page-1', 'uuid:page-2']);
    expect(rows[1][0].pid).toBe('uuid:page-3');
  });

  it('keeps the last row when the page count is not a multiple of the columns', () => {
    pagesOnly$.next(makePages(7));
    fixture.detectChanges();

    const grid = gridInstance();

    const rows = grid.rows();
    expect(rows.length).toBe(3);
    expect(rows[2].length).toBe(1);
    expect(rows[2][0].pid).toBe('uuid:page-6');
  });

  it('renders every page of a short document (no virtualization loss)', async () => {
    pagesOnly$.next(makePages(6));
    await settleViewport();

    expect(renderedItems()).toBe(6);
  });
});
