import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { FolderSearchScope } from './folder-search-scope.service';

describe('FolderSearchScope', () => {
  let service: FolderSearchScope;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(FolderSearchScope);
  });

  it('chunk splits into consecutive batches', () => {
    expect(service.chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  it('mergeResponses sums ungrouped numFound and concats docs', () => {
    const merged = service.mergeResponses([
      { response: { docs: [{ pid: 'a' }], numFound: 1 }, facet_counts: { facet_fields: { model: ['monograph', 1] }, facet_queries: { q1: 2 } } } as any,
      { response: { docs: [{ pid: 'b' }], numFound: 3 }, facet_counts: { facet_fields: { model: ['monograph', 2, 'page', 4] }, facet_queries: { q1: 5 } } } as any,
    ]);
    expect(merged.response.numFound).toBe(4);
    expect(merged.response.docs.map((d: any) => d.pid)).toEqual(['a', 'b']);
    expect(merged.facet_counts.facet_fields['model']).toEqual(['monograph', 3, 'page', 4]);
    expect(merged.facet_counts.facet_queries!['q1']).toBe(7);
  });

  it('mergeResponses sums grouped ngroups and concats groups', () => {
    const merged = service.mergeResponses([
      { grouped: { 'root.pid': { ngroups: 2, groups: [{ groupValue: 'r1' }, { groupValue: 'r2' }] } }, facet_counts: { facet_fields: {}, facet_queries: {} } } as any,
      { grouped: { 'root.pid': { ngroups: 1, groups: [{ groupValue: 'r3' }] } }, facet_counts: { facet_fields: {}, facet_queries: {} } } as any,
    ]);
    expect(merged.grouped!['root.pid'].ngroups).toBe(3);
    expect(merged.grouped!['root.pid'].groups.map((g: any) => g.groupValue)).toEqual(['r1', 'r2', 'r3']);
  });
});
