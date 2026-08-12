import { signal } from '@angular/core';
import { DetailViewService } from './detail-view.service';

/**
 * Covers the convolute "parts" derivation.
 *
 * DetailViewService pulls in the store, router and viewer services, and its
 * constructor registers effects — none of which these methods touch. They only
 * read the `_pages` / `_currentPageIndex` signals, so the instance is built
 * without Angular's injector and those two signals are seeded directly.
 */
describe('DetailViewService convolute parts', () => {

  const page = (pid: string, partPid?: string, partTitle?: string) => ({
    pid,
    model: 'page',
    ...(partPid ? { 'convolute.part.pid': partPid, 'convolute.part.title': partTitle ?? '' } : {}),
  });

  function serviceWithPages(pages: any[], currentPageIndex = 0): DetailViewService {
    const service = Object.create(DetailViewService.prototype) as DetailViewService;
    (service as any)._pages = signal(pages);
    (service as any)._currentPageIndex = signal(currentPageIndex);
    return service;
  }

  it('lists each bound work once, in binding order, with its first page index', () => {
    const service = serviceWithPages([
      page('p1', 'work1', 'SINFONIE PERIDIQUE'),
      page('p2', 'work1', 'SINFONIE PERIDIQUE'),
      page('p3', 'work2', '[Sinfonie]: 2 Violino'),
    ]);

    expect(service.convoluteParts()).toEqual([
      { pid: 'work1', title: 'SINFONIE PERIDIQUE', firstPageIndex: 0 },
      { pid: 'work2', title: '[Sinfonie]: 2 Violino', firstPageIndex: 2 },
    ]);
    expect(service.hasConvoluteParts()).toBe(true);
  });

  it('is empty for a normal document, so the parts tab stays hidden', () => {
    const service = serviceWithPages([page('p1'), page('p2')]);

    expect(service.convoluteParts()).toEqual([]);
    expect(service.hasConvoluteParts()).toBe(false);
  });

  it('reports which part the current page belongs to', () => {
    const pages = [
      page('p1', 'work1', 'First'),
      page('p2', 'work2', 'Second'),
      page('p3', 'work2', 'Second'),
    ];

    expect(serviceWithPages(pages, 0).currentConvolutePartIndex()).toBe(0);
    // A later page of the second work still resolves to that work.
    expect(serviceWithPages(pages, 2).currentConvolutePartIndex()).toBe(1);
  });

  it('reports -1 when the current page belongs to no part', () => {
    expect(serviceWithPages([page('p1')], 0).currentConvolutePartIndex()).toBe(-1);
  });

  it('falls back to an empty title when the work has none', () => {
    const service = serviceWithPages([page('p1', 'work1')]);
    expect(service.convoluteParts()).toEqual([{ pid: 'work1', title: '', firstPageIndex: 0 }]);
  });
});
