import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { AltoService } from './alto.service';

/**
 * Builds a minimal ALTO document from a list of words laid out on one line.
 * Each word gets a 10px-wide box, spaced 20px apart, so boxes are identifiable
 * by their HPOS (word index * 20).
 */
function altoWith(words: string[]): string {
  const strings = words
    .map((w, i) => `<String CONTENT="${w}" HPOS="${i * 20}" VPOS="100" WIDTH="10" HEIGHT="8"/>`)
    .join('');
  return `<?xml version="1.0" encoding="UTF-8"?>
    <alto><Layout><Page WIDTH="1000" HEIGHT="500"><PrintSpace>
      <TextBlock><TextLine>${strings}</TextLine></TextBlock>
    </PrintSpace></Page></Layout></alto>`;
}

/** Word index each returned box came from, ascending. */
function matchedIndexes(boxes: { x: number }[]): number[] {
  return boxes.map(b => b.x / 20).sort((a, b) => a - b);
}

describe('AltoService', () => {
  let service: AltoService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AltoService, provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(AltoService);
  });

  describe('getBoxes with a quoted phrase', () => {
    it('matches only adjacent words in the quoted order', () => {
      // "hájek" appears alone at index 0, the phrase occupies indexes 3 and 4.
      const alto = altoWith(['hájek', 'psal', 'že', 'karel', 'hájek', 'přišel']);

      const boxes = service.getBoxes(alto, '"karel hájek"');

      expect(matchedIndexes(boxes)).toEqual([3, 4]);
    });

    it('does not match the phrase words when they are far apart', () => {
      const alto = altoWith(['karel', 'a', 'jeho', 'přítel', 'hájek']);

      const boxes = service.getBoxes(alto, '"karel hájek"');

      expect(boxes).toEqual([]);
    });

    it('matches a phrase in reversed order as no match', () => {
      const alto = altoWith(['hájek', 'karel']);

      const boxes = service.getBoxes(alto, '"karel hájek"');

      expect(boxes).toEqual([]);
    });

    it('matches every occurrence of the phrase on the page', () => {
      const alto = altoWith(['karel', 'hájek', 'x', 'karel', 'hájek']);

      const boxes = service.getBoxes(alto, '"karel hájek"');

      expect(matchedIndexes(boxes)).toEqual([0, 1, 3, 4]);
    });

    it('ignores punctuation attached to phrase words', () => {
      const alto = altoWith(['(karel', 'hájek),']);

      const boxes = service.getBoxes(alto, '"karel hájek"');

      expect(matchedIndexes(boxes)).toEqual([0, 1]);
    });

    it('matches a single-word quoted term', () => {
      const alto = altoWith(['karel', 'hájek']);

      const boxes = service.getBoxes(alto, '"hájek"');

      expect(matchedIndexes(boxes)).toEqual([1]);
    });
  });

  describe('getBoxes without quotes', () => {
    it('still matches each word independently', () => {
      const alto = altoWith(['karel', 'a', 'jeho', 'přítel', 'hájek']);

      const boxes = service.getBoxes(alto, 'karel hájek');

      expect(matchedIndexes(boxes)).toEqual([0, 4]);
    });

    it('matches a bare single word', () => {
      const alto = altoWith(['karel', 'hájek']);

      const boxes = service.getBoxes(alto, 'hájek');

      expect(matchedIndexes(boxes)).toEqual([1]);
    });
  });

  describe('getBoxes mixing a phrase with loose words', () => {
    it('applies phrase adjacency only to the quoted part', () => {
      // Phrase at 0-1; the loose word "praha" matches wherever it appears.
      const alto = altoWith(['karel', 'hájek', 'v', 'praze', 'praha', 'hájek']);

      const boxes = service.getBoxes(alto, '"karel hájek" praha');

      expect(matchedIndexes(boxes)).toEqual([0, 1, 4]);
    });
  });
});

/**
 * A page can have OCR text without ALTO: `/info` reports `ocr.text` and
 * `ocr.alto` separately, and in a CDK document held by several libraries the
 * same page exists once per source — one copy can have ALTO where another has
 * only the text. Everything that needs the words but not their coordinates must
 * therefore fall back to `/ocr/text` rather than failing.
 */
describe('AltoService OCR fallback', () => {
  let service: AltoService;
  let http: HttpTestingController;

  // TextLine needs its own geometry: both getStyledHtml and getBlocksForReading
  // lay out from the line box, not from the individual String boxes.
  const ALTO = `<?xml version="1.0" encoding="UTF-8"?>
    <alto><Layout><Page WIDTH="1000" HEIGHT="500"><PrintSpace WIDTH="1000" HEIGHT="500">
      <TextBlock HPOS="0" VPOS="100" WIDTH="200" HEIGHT="20">
        <TextLine HPOS="0" VPOS="100" WIDTH="200" HEIGHT="20">
          <String CONTENT="Hello" HPOS="0" VPOS="100" WIDTH="80" HEIGHT="20"/>
          <String CONTENT="world" HPOS="100" VPOS="100" WIDTH="80" HEIGHT="20"/>
        </TextLine>
      </TextBlock>
    </PrintSpace></Page></Layout></alto>`;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [AltoService, provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(AltoService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  describe('fetchPageText', () => {
    it('uses ALTO when the page has it, keeping the styled rendition', () => {
      let result: { text: string; html: string } | undefined;
      service.fetchPageText('uuid:p1').subscribe(r => result = r);

      http.expectOne('/items/uuid:p1/ocr/alto').flush(ALTO);

      expect(result!.text).toContain('Hello');
      expect(result!.html).toBeTruthy();
    });

    it('falls back to /ocr/text when ALTO is missing', () => {
      let result: { text: string; html: string } | undefined;
      service.fetchPageText('uuid:p1').subscribe(r => result = r);

      http.expectOne('/items/uuid:p1/ocr/alto')
        .flush('Not found', { status: 404, statusText: 'Not Found' });
      http.expectOne('/items/uuid:p1/ocr/text').flush('  plain ocr text  ');

      expect(result!.text).toBe('plain ocr text');
      // No ALTO means no styling to preserve; callers render `text` instead.
      expect(result!.html).toBe('');
    });

    it('does not request the fallback when ALTO succeeds', () => {
      service.fetchPageText('uuid:p1').subscribe();

      http.expectOne('/items/uuid:p1/ocr/alto').flush(ALTO);

      http.expectNone('/items/uuid:p1/ocr/text');
    });

    it('errors when both sources fail, rather than reporting an empty page', () => {
      // A restricted page must not be indistinguishable from one with no OCR.
      let errored = false;
      service.fetchPageText('uuid:p1').subscribe({ error: () => errored = true });

      http.expectOne('/items/uuid:p1/ocr/alto')
        .flush('nope', { status: 403, statusText: 'Forbidden' });
      http.expectOne('/items/uuid:p1/ocr/text')
        .flush('nope', { status: 403, statusText: 'Forbidden' });

      expect(errored).toBe(true);
    });
  });

  describe('fetchBlocksForReading', () => {
    it('uses ALTO blocks, which carry the geometry the highlight needs', () => {
      let blocks: any[] | undefined;
      service.fetchBlocksForReading('uuid:p1').subscribe(b => blocks = b);

      http.expectOne('/items/uuid:p1/ocr/alto').flush(ALTO);

      expect(blocks!.length).toBeGreaterThan(0);
      expect(blocks![0].width).toBeGreaterThan(0);
    });

    it('splits the fallback text into paragraph blocks with no geometry', () => {
      let blocks: any[] | undefined;
      service.fetchBlocksForReading('uuid:p1').subscribe(b => blocks = b);

      http.expectOne('/items/uuid:p1/ocr/alto')
        .flush('Not found', { status: 404, statusText: 'Not Found' });
      http.expectOne('/items/uuid:p1/ocr/text')
        .flush('First paragraph\nstill first.\n\nSecond paragraph.');

      expect(blocks!.length).toBe(2);
      expect(blocks![0].text).toBe('First paragraph still first.');
      expect(blocks![1].text).toBe('Second paragraph.');
      // Zero-size blocks are skipped by showTtsHighlight, so reading works and
      // only the on-page highlight is lost.
      expect(blocks![0].width).toBe(0);
      expect(blocks![0].height).toBe(0);
    });

    it('yields no blocks when the fallback text is empty', () => {
      let blocks: any[] | undefined;
      service.fetchBlocksForReading('uuid:p1').subscribe(b => blocks = b);

      http.expectOne('/items/uuid:p1/ocr/alto')
        .flush('Not found', { status: 404, statusText: 'Not Found' });
      http.expectOne('/items/uuid:p1/ocr/text').flush('   \n\n  ');

      expect(blocks!).toEqual([]);
    });
  });
});
