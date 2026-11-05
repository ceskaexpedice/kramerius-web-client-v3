import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HttpUrlEncodingCodec } from '@angular/common/http';
import { FolderSearchScope } from './folder-search-scope.service';
import { SolrService } from '../../../core/solr/solr.service';

describe('FolderSearchScope', () => {
  let service: FolderSearchScope;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(FolderSearchScope);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('chunk splits into consecutive batches', () => {
    expect(service.chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  describe('chunkScope', () => {
    const encodedClauseLength = (ids: string[], exact: boolean) =>
      new HttpUrlEncodingCodec()
        .encodeValue(`(${ids.map(id => SolrService.pidScopeTerm(id, exact)).join(' OR ')})`).length;

    it('returns no chunks for an empty scope', () => {
      expect(service.chunkScope([])).toEqual([]);
    });

    it('keeps each encoded scope clause within the budget, preserving order', () => {
      const ids = Array.from({ length: 30 }, (_, i) => `uuid:${i}/uuid:child-${i}`);
      const chunks = service.chunkScope(ids, false, 300);

      expect(chunks.length).toBeGreaterThan(1);
      expect(chunks.flat()).toEqual(ids);
      for (const chunk of chunks) {
        expect(encodedClauseLength(chunk, false)).toBeLessThanOrEqual(300);
      }
    });

    it('packs chunks as full as the budget allows', () => {
      const ids = Array.from({ length: 30 }, (_, i) => `uuid:${i}`);
      const chunks = service.chunkScope(ids, true, 300);

      for (let i = 0; i < chunks.length - 1; i++) {
        const withNext = [...chunks[i], chunks[i + 1][0]];
        expect(encodedClauseLength(withNext, true)).toBeGreaterThan(300);
      }
    });

    it('gives an id longer than the budget its own chunk instead of dropping it', () => {
      const long = `uuid:${'x'.repeat(400)}`;
      expect(service.chunkScope(['uuid:a', long, 'uuid:b'], false, 100))
        .toEqual([['uuid:a'], [long], ['uuid:b']]);
    });
  });

  it('resolveScopePaths requests own_pid_path and falls back to pid', (done) => {
    service.resolveScopePaths(['uuid:child', 'uuid:root']).subscribe(paths => {
      expect(paths).toEqual(['uuid:parent/uuid:child', 'uuid:root']);
      done();
    });

    const req = httpMock.expectOne(r => r.params.get('fl') === 'pid,own_pid_path');
    expect(req.request.params.get('q')).toBe('(pid:"uuid:child" OR pid:"uuid:root")');
    req.flush({
      response: {
        docs: [
          { pid: 'uuid:child', 'own_pid_path': 'uuid:parent/uuid:child' },
          { pid: 'uuid:root' },
        ],
      },
    });
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

  it('replaceFacetField swaps in the source counts, dropping local-params variants', () => {
    const base = {
      response: { docs: [], numFound: 3 },
      facet_counts: {
        facet_fields: { '{!ex=model}model': ['page', 3], 'licenses.facet': ['public', 2] },
        facet_queries: { '{!ex=avail}*:*': 3 },
      },
    } as any;
    const source = {
      facet_counts: { facet_fields: { model: ['page', 3, 'periodical', 1, 'supplement', 1] }, facet_queries: {} },
    } as any;

    const result = service.replaceFacetField(base, source, 'model') as any;

    expect(result.facet_counts.facet_fields).toEqual({
      'licenses.facet': ['public', 2],
      model: ['page', 3, 'periodical', 1, 'supplement', 1],
    });
    expect(result.facet_counts.facet_queries).toEqual({ '{!ex=avail}*:*': 3 });
    expect(result.response.numFound).toBe(3);
  });

  it('replaceFacetField leaves base untouched when the source lacks the field', () => {
    const base = { facet_counts: { facet_fields: { model: ['page', 1] }, facet_queries: {} } } as any;
    expect(service.replaceFacetField(base, { facet_counts: { facet_fields: {} } } as any, 'model')).toBe(base);
  });

  it('mergeResponses keeps the OCR highlighting of every chunk', () => {
    const merged = service.mergeResponses([
      { response: { docs: [{ pid: 'p1' }], numFound: 1 }, highlighting: { p1: { text_ocr: ['<strong>hlas</strong> a'] } } } as any,
      { response: { docs: [{ pid: 'p2' }], numFound: 1 }, highlighting: { p2: { text_ocr: ['b <strong>hlas</strong>'] } } } as any,
      { response: { docs: [], numFound: 0 } } as any,
    ]) as any;
    expect(merged.highlighting).toEqual({
      p1: { text_ocr: ['<strong>hlas</strong> a'] },
      p2: { text_ocr: ['b <strong>hlas</strong>'] },
    });
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
