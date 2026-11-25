import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { AdvancedSearchService, stripWrappingQuotes } from './advanced-search.service';
import { QueryParamsService } from '../../core/services/QueryParamsManager';
import { LibraryContextService } from './library-context.service';
import { BreakpointService } from './breakpoint.service';

describe('AdvancedSearchService multi-word values', () => {
  let service: AdvancedSearchService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AdvancedSearchService,
        { provide: MatDialog, useValue: {} },
        { provide: QueryParamsService, useValue: {} },
        { provide: ActivatedRoute, useValue: {} },
        { provide: Router, useValue: {} },
        { provide: LibraryContextService, useValue: {} },
        { provide: BreakpointService, useValue: {} },
      ]
    });
    service = TestBed.inject(AdvancedSearchService);
  });

  it('keeps a full-text phrase from the URL in one pair of quotes', () => {
    service.resetFromParams({ advSearch: '(text_ocr:("Masarykova univerzita"))' });

    expect(service.getAdvancedQueryString()).toBe('(text_ocr:("Masarykova univerzita"))');
    expect(service.getSolrAdvancedQueryString()).not.toContain('""');
  });

  it('does not double quotes the reader typed', () => {
    service.resetFromParams({ advSearch: '(text_ocr:(Brno))' });
    const filter = service.pendingGroups()[0].filters[0];
    filter.values = [{ elementValue: '"Masarykova univerzita"', solrValue: '"Masarykova univerzita"' }];

    expect(service.getAdvancedQueryString()).toBe('(text_ocr:("Masarykova univerzita"))');
    expect(service.getSolrAdvancedQueryString()).not.toContain('""');
  });

  it('keeps a single word as it was', () => {
    service.resetFromParams({ advSearch: '(text_ocr:(Hodonín))' });
    expect(service.getAdvancedQueryString()).toBe('(text_ocr:(Hodonín))');
  });
});

describe('stripWrappingQuotes', () => {
  it('drops one wrapping pair only', () => {
    expect(stripWrappingQuotes('"two words"')).toBe('two words');
    expect(stripWrappingQuotes('word')).toBe('word');
    expect(stripWrappingQuotes('"a" "b"')).toBe('"a" "b"');
    expect(stripWrappingQuotes('"')).toBe('"');
  });
});
