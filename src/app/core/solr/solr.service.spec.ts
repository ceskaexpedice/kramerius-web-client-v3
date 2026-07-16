import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { SolrService } from './solr.service';
import { SolrSortDirections, SolrSortFields } from './solr-helpers';

describe('SolrService pidScope', () => {
  let service: SolrService;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(SolrService);
  });

  it('buildQParam appends a pid_paths scope clause when pidScope is provided', () => {
    const q = (service as any).buildQParam(
      'hajek', undefined, false, false, false, null, null, true, true,
      ['uuid:aaa', 'uuid:bbb']
    );
    expect(q).toContain('pid_paths:uuid\\:aaa*');
    expect(q).toContain('pid_paths:uuid\\:bbb*');
    // scope is AND-ed into the query
    expect(q).toContain(' AND ');
  });

  it('buildQParam uses an exact pid clause when pidScopeExact is set (folder listing)', () => {
    const q = (service as any).buildQParam(
      '', undefined, false, false, false, null, null, true, true,
      ['uuid:aaa', 'uuid:bbb'], true
    );
    expect(q).toContain('pid:"uuid:aaa"');
    expect(q).toContain('pid:"uuid:bbb"');
    expect(q).not.toContain('pid_paths:');
  });

  it('buildQParam is unchanged when pidScope is empty (main search unaffected)', () => {
    const withEmpty = (service as any).buildQParam(
      'hajek', undefined, false, false, false, null, null, true, true, []
    );
    const withoutArg = (service as any).buildQParam(
      'hajek', undefined, false, false, false, null, null, true, true
    );
    expect(withEmpty).toEqual(withoutArg);
    expect(withEmpty).not.toContain('pid_paths:');
  });
});

describe('SolrService collection scope', () => {
  let service: SolrService;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(SolrService);
  });

  it('buildQParam no longer embeds the collection filter in q', () => {
    const q = (service as any).buildQParam(
      '', undefined, false, false, false, null, 'uuid:1045ed89-7f7e-48c9-a4c5-9a921b97b9e6'
    );
    expect(q).not.toContain('in_collections');
  });

  it('buildCollectionScopeFq filters by direct membership only', () => {
    const fq = (service as any).buildCollectionScopeFq('uuid:abc');
    expect(fq).toEqual('(in_collections.direct:"uuid:abc")');
  });
});

describe('SolrService standalone-collection fq', () => {
  let service: SolrService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(SolrService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  const standaloneFq = '((*:* -model:collection) OR collection.is_standalone:true)';

  function fqParamsOfSearch(pidScope: string[]): string[] {
    service.search('', [], {}, 0, 60, SolrSortFields.relevance, SolrSortDirections.desc,
      undefined, false, false, [], undefined, undefined, true, true, false, pidScope
    ).subscribe();
    const req = httpMock.expectOne(() => true);
    const fqs = req.request.params.getAll('fq') ?? [];
    req.flush({ response: { docs: [], numFound: 0 } });
    return fqs;
  }

  it('applies the standalone fq on the main (unscoped) search', () => {
    expect(fqParamsOfSearch([])).toContain(standaloneFq);
  });

  it('skips the standalone fq when a folder pidScope is present', () => {
    expect(fqParamsOfSearch(['uuid:parent/uuid:child'])).not.toContain(standaloneFq);
  });
});
