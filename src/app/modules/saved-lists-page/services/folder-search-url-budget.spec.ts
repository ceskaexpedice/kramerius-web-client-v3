import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { HttpUrlEncodingCodec } from '@angular/common/http';
import { FolderSearchScope } from './folder-search-scope.service';
import { SolrService } from '../../../core/solr/solr.service';

/**
 * The folder search sends its pid scope in the GET query string. The API's
 * Tomcat answers HTTP 400 (without CORS headers, so the browser reports status
 * 0 and the app shows the server-error dialog) once the request line plus ALL
 * request headers exceed ~8 KB. Measured against cdk-api.dev with curl: with a
 * 2158-char bearer token a 5533-char URL passes and a 5881-char one fails;
 * without the token the cut-off moves to ~7.5 KB.
 *
 * So the budget is shared by the URL, the logged-in user's Authorization header
 * and the browser's own headers (sec-ch-ua*, user-agent, referer, origin, ...).
 *
 * Regression: folder "Genealogie" (56 items) searched with query=hlas failed for
 * a logged-in user — fixed 25-path chunks produced 6.1 KB and 7.1 KB URLs that,
 * with the token, went over the limit.
 */
const SERVER_HEADER_LIMIT = 8192;

/** `Authorization: Bearer <token>` with a token the size of a real CDK session. */
const AUTH_HEADER_LENGTH = 'Authorization: Bearer '.length + 2158;

/** Conservative estimate of Chrome's other request headers + proxy additions. */
const OTHER_HEADERS_LENGTH = 1200;

/** An fq the size of an active facet/license filter set. */
const ACTIVE_FQ = `licenses.facet:("dnnto" OR "public" OR "cover-and-content" OR "mzk_public-muo" OR "mzk_public-contract" OR "orphan" OR "knav_public_contract") AND model:(monograph OR periodical OR sheetmusic) AND languages.facet:cze`;

/** Facet params the folder search always sends alongside the pid scope. */
const FACET_FIELDS = [
  'licenses.facet', 'model', 'authors.facet', 'languages.facet', 'genres.facet',
  'keywords.facet', 'geographic_names.facet', 'publishers.facet',
  'publication_places.facet', 'physical_locations.facet',
  'subject_names_personal.facet', 'subject_names_corporate.facet',
  'subject_temporals.facet', 'accessibility',
];

// Real shape, deduplicated as the request builder sends them.
const USER_LICENSES = [
  'dnnto', 'public', 'cover-and-content', 'mzk_public-muo', 'mzk_public-contract',
  'orphan', 'knav_public_contract', 'MLP_public-contract',
];

const codec = new HttpUrlEncodingCodec();

/** A realistic own_pid_path: a 4-level periodical path. */
function scopePath(i: number): string {
  const seg = (n: number) => `uuid:${String(n).padStart(8, '0')}-f3e0-11e0-a32e-000d606f5dc6`;
  return [seg(i), seg(i + 1000), seg(i + 2000), seg(i + 3000)].join('/');
}

/** A single saved-item uuid (exact-scope listing, no text query). */
function itemPid(i: number): string {
  return `uuid:${String(i).padStart(8, '0')}-f3e0-11e0-a32e-000d606f5dc6`;
}

/**
 * Builds the folder facet request URL the way SolrService does (HttpParams
 * encoding), with a text query, an active fq and the logged-in license facets.
 */
function buildFacetUrl(scope: string[], exact: boolean): string {
  const scopeClause = `(${scope.map(id => SolrService.pidScopeTerm(id, exact)).join(' OR ')})`;
  const textClause = '(title.search:(hlas)^15 OR titles.search:(hlas)^10 OR authors.search:(hlas)^2 OR text_ocr:(hlas)^0.1)';
  const parts: [string, string][] = [
    ['fq', ACTIVE_FQ],
    ['q', `${scopeClause} AND ${textClause}`], ['wt', 'json'], ['fl', ''],
    ['start', '0'], ['rows', '0'], ['facet', 'true'], ['facet.mincount', '1'],
  ];
  FACET_FIELDS.forEach(f => parts.push(['facet.field', f]));
  parts.push(['facet.query', '{!ex=avail}*:*']);
  const groups = [
    USER_LICENSES,
    ['public', 'orphan', 'mzk_public-contract', 'mzk_public-muo', 'knav_public_contract'],
    ['dnntt', 'onsite', 'onsite-sheetmusic'],
    ['dnnto'],
  ];
  for (const g of groups) {
    parts.push(['facet.query', `{!ex=avail}(${g.map(l => `licenses.facet:"${l}"`).join(' OR ')})`]);
  }
  const qs = parts.map(([k, v]) => `${codec.encodeKey(k)}=${codec.encodeValue(v)}`).join('&');
  return `https://cdk-api.dev.ceskadigitalniknihovna.cz/search/api/client/v7.0/search?${qs}`;
}

/** Request line + headers of a logged-in user's request, as Tomcat counts it. */
function loggedInRequestSize(url: string): number {
  const requestLine = `GET ${new URL(url).pathname}${new URL(url).search} HTTP/1.1`.length;
  return requestLine + AUTH_HEADER_LENGTH + OTHER_HEADERS_LENGTH;
}

describe('folder search URL budget', () => {
  let scopeService: FolderSearchScope;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    scopeService = TestBed.inject(FolderSearchScope);
  });

  it('fixed 25-path chunks overflowed the limit for a logged-in user (the bug)', () => {
    const oldChunk = Array.from({ length: 25 }, (_, i) => scopePath(i));
    expect(loggedInRequestSize(buildFacetUrl(oldChunk, false))).toBeGreaterThan(SERVER_HEADER_LIMIT);
  });

  it('splits a 56-item fulltext folder search into chunks that each fit, logged in', () => {
    const scope = Array.from({ length: 56 }, (_, i) => scopePath(i));
    const chunks = scopeService.chunkScope(scope);

    expect(chunks.flat()).toEqual(scope);
    for (const chunk of chunks) {
      expect(loggedInRequestSize(buildFacetUrl(chunk, false))).toBeLessThanOrEqual(SERVER_HEADER_LIMIT);
    }
  });

  it('splits a 56-item exact-scope listing into chunks that each fit, logged in', () => {
    const scope = Array.from({ length: 56 }, (_, i) => itemPid(i));
    const chunks = scopeService.chunkScope(scope, true);

    expect(chunks.flat()).toEqual(scope);
    for (const chunk of chunks) {
      expect(loggedInRequestSize(buildFacetUrl(chunk, true))).toBeLessThanOrEqual(SERVER_HEADER_LIMIT);
    }
  });
});
