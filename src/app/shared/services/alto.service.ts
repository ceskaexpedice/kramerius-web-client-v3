import { Injectable } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { EnvironmentService } from './environment.service';
import { CdkSourceService } from './cdk-source.service';
import { SKIP_ERROR_INTERCEPTOR } from '../../core/services/http-context-tokens';
import { escapeHtml } from '../utils/escape-html';

export interface AltoBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AltoCoordinates {
  boxes: AltoBox[];
  imageWidth: number;
  imageHeight: number;
}

export interface AltoTextBlock {
  text: string;
  hMin: number;
  hMax: number;
  vMin: number;
  vMax: number;
  width: number;
  height: number;
}

@Injectable({
  providedIn: 'root'
})
export class AltoService {

  constructor(
    private http: HttpClient,
    private env: EnvironmentService,
    private cdkSource: CdkSourceService
  ) { }

  private get API_URL(): string {
    const url = this.env.getApiUrl('items');
    if (!url) {
      console.warn('AltoService: API URL not available. Environment may not be loaded yet.');
      return '';
    }
    return url;
  }

  /**
   * Fetches ALTO XML for a specific page. The URL is prefixed with the selected
   * CDK member library so the request targets the right library instead of the
   * aggregated endpoint.
   * @param pid - Page identifier
   * @returns Observable with ALTO XML string
   */
  fetchAltoXml(pid: string): Observable<string> {
    const url = this.API_URL + this.cdkSource.prefixedItemPath(pid, 'ocr/alto');
    return this.http.get(url, {
      responseType: 'text',
      context: new HttpContext().set(SKIP_ERROR_INTERCEPTOR, true)
    });
  }

  /**
   * Fetches the plain OCR text for a page (`/ocr/text`).
   *
   * The counterpart to `fetchAltoXml` for everything that only needs the words,
   * not their coordinates. A page can carry one without the other: `/info`
   * reports `ocr.text` and `ocr.alto` separately, and digitisation that produced
   * no ALTO still produces this.
   */
  fetchOcrText(pid: string): Observable<string> {
    const url = this.API_URL + this.cdkSource.prefixedItemPath(pid, 'ocr/text');
    return this.http.get(url, {
      responseType: 'text',
      context: new HttpContext().set(SKIP_ERROR_INTERCEPTOR, true)
    });
  }

  /**
   * The page's text, with its formatting when the source allows it.
   *
   * ALTO is tried first because it carries font sizes and line structure, which
   * `getStyledHtml` turns into a readable rendition rather than a wall of words.
   * When a page has no ALTO the plain `/ocr/text` datastream still has the text,
   * so callers that only need words — the transcript panel, translation,
   * summarisation — degrade to unstyled text instead of failing outright.
   *
   * This split is real in the data, not defensive coding: in a CDK document held
   * by several libraries the same page exists once per source, and one source's
   * copy can have ALTO while another's has only the text.
   *
   * `html` is empty whenever the text came from the fallback, so callers should
   * render `text` in that case. Both empty means the page genuinely has no OCR;
   * a failure of BOTH requests surfaces as an error, so a restricted page is not
   * silently reported as an empty one.
   */
  fetchPageText(pid: string): Observable<{ text: string; html: string }> {
    return this.fetchAltoXml(pid).pipe(
      map(altoXml => ({
        text: this.getFullText(altoXml),
        html: this.getStyledHtml(altoXml),
      })),
      // Keep ALTO authoritative when it parses to nothing usable: an empty ALTO
      // and a missing one are different states, and only the latter falls back.
      catchError(() => this.fetchOcrText(pid).pipe(
        map(text => ({ text: (text ?? '').trim(), html: '' })),
      )),
    );
  }

  /**
   * The page's reading blocks, falling back to the plain OCR text.
   *
   * Read-aloud needs the text split into chunks it can speak one at a time; the
   * geometry on each block is what lets the viewer highlight the passage being
   * read. ALTO supplies both, so it is tried first.
   *
   * Without ALTO the words are still available from `/ocr/text`, so the fallback
   * splits that on blank lines into paragraph-sized blocks with ZERO geometry.
   * Reading then works and only the highlight is lost: `showTtsHighlight` bails
   * out on a zero-size block, so a block with no coordinates is simply not drawn
   * rather than drawn in the wrong place.
   */
  fetchBlocksForReading(pid: string): Observable<AltoTextBlock[]> {
    return this.fetchAltoXml(pid).pipe(
      map(altoXml => this.getBlocksForReading(altoXml)),
      catchError(() => this.fetchOcrText(pid).pipe(
        map(text => this.textToReadingBlocks(text)),
      )),
    );
  }

  /**
   * Splits plain OCR text into geometry-less reading blocks, one per paragraph.
   *
   * Paragraph-sized rather than line-sized: a block is one TTS request and one
   * highlight step, and speaking a scan line by line breaks sentences apart mid
   * clause. Blank lines are the only structure `/ocr/text` offers, so they are
   * what the split has to use.
   */
  private textToReadingBlocks(text: string): AltoTextBlock[] {
    return (text ?? '')
      .split(/\n\s*\n/)
      .map(part => part.replace(/\s+/g, ' ').trim())
      .filter(part => part.length > 0)
      .map(part => ({
        text: part,
        hMin: 0, hMax: 0, vMin: 0, vMax: 0, width: 0, height: 0,
      }));
  }

  /**
   * Parses ALTO XML and extracts bounding boxes for matched words
   * Returns boxes in ALTO pixel coordinates
   *
   * Quoted parts of the query are matched as phrases (consecutive words),
   * mirroring Solr, so a search for "karel hájek" does not light up every
   * stray "karel" and "hájek" on the page.
   *
   * @param altoXml - ALTO XML string
   * @param searchTerms - Search query string, or array of already-split words
   * @returns Array of bounding boxes in ALTO pixel coordinates
   */
  getBoxes(
    altoXml: string,
    searchTerms: string | string[]
  ): AltoBox[] {
    const terms = this.parseSearchTerms(searchTerms);
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(altoXml, 'text/xml');

    // Check for XML parsing errors
    const parserError = xmlDoc.querySelector('parsererror');
    if (parserError) {
      console.error('Error parsing ALTO XML:', parserError.textContent);
      return [];
    }

    const strings = Array.from(xmlDoc.getElementsByTagName('String'));

    return this.extractBoxesFromStrings(strings, terms);
  }

  /**
   * Gets ALTO page dimensions
   * @param altoXml - ALTO XML string
   * @returns Object with width and height of ALTO page
   */
  getAltoDimensions(altoXml: string): { width: number; height: number } {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(altoXml, 'text/xml');

    const page = xmlDoc.getElementsByTagName('Page')[0];
    const printSpace = xmlDoc.getElementsByTagName('PrintSpace')[0];

    let altoWidth = parseInt(page?.getAttribute('WIDTH') || '0', 10);
    let altoHeight = parseInt(page?.getAttribute('HEIGHT') || '0', 10);

    if (altoWidth === 0 || altoHeight === 0) {
      altoWidth = parseInt(printSpace?.getAttribute('WIDTH') || '0', 10);
      altoHeight = parseInt(printSpace?.getAttribute('HEIGHT') || '0', 10);
    }

    return { width: altoWidth, height: altoHeight };
  }

  /**
   * Parses a search query into terms to highlight.
   *
   * A double-quoted group is kept together as a phrase, so it only highlights
   * where those words appear next to each other in that order — matching how
   * Solr treats a quoted query. Unquoted words stay independent terms.
   *
   * @param searchTerms - Search query as string, or pre-split array of words
   * @returns Array of terms, each a list of consecutive words to match
   */
  private parseSearchTerms(searchTerms: string | string[]): string[][] {
    if (Array.isArray(searchTerms)) {
      return searchTerms
        .map(term => this.normalizeWord(term))
        .filter(term => term.length > 0)
        .map(term => [term]);
    }

    // Remove fuzzy search notation (e.g., "word~" becomes "word")
    let cleanedQuery = searchTerms;
    if (cleanedQuery.includes('~')) {
      cleanedQuery = cleanedQuery.substring(0, cleanedQuery.indexOf('~'));
    }

    const terms: string[][] = [];

    // Split into quoted groups and the loose text between them. An unterminated
    // trailing quote is treated as a phrase too, so highlighting keeps up with
    // what the user has typed so far.
    const tokenPattern = /"([^"]*)"?|(\S+)/g;
    let match: RegExpExecArray | null;

    while ((match = tokenPattern.exec(cleanedQuery)) !== null) {
      const [, quoted, bare] = match;

      if (quoted !== undefined) {
        const words = this.normalizeWords(quoted.split(/\s+/));
        if (words.length > 0) {
          terms.push(words);
        }
      } else if (bare !== undefined) {
        const words = this.normalizeWords([bare]);
        if (words.length > 0) {
          terms.push(words);
        }
      }
    }

    return terms;
  }

  /**
   * Normalizes a list of words, dropping any that normalize to nothing
   * @param words - Words to normalize
   * @returns Normalized, non-empty words
   */
  private normalizeWords(words: string[]): string[] {
    return words
      .map(word => this.normalizeWord(word))
      .filter(word => word.length > 0);
  }

  /**
   * Normalizes a single word by removing punctuation and converting to lowercase
   * @param word - Word to normalize
   * @returns Normalized word
   */
  private normalizeWord(word: string): string {
    return word
      .toLowerCase()
      .replace(/[-?!»«;().,„""]/g, '');
  }

  /**
   * Extracts bounding boxes from ALTO String elements that match search terms
   * Returns boxes in ALTO pixel coordinates (not scaled)
   *
   * A multi-word term is a phrase: it only matches where those words appear
   * consecutively, and every word of the match gets its own box.
   *
   * @param strings - Array of String elements from ALTO XML
   * @param searchTerms - Parsed search terms, each a list of consecutive words
   * @returns Array of bounding boxes in ALTO coordinates
   */
  private extractBoxesFromStrings(
    strings: Element[],
    searchTerms: string[][]
  ): AltoBox[] {
    const boxes: AltoBox[] = [];

    for (const words of searchTerms) {
      for (let i = 0; i <= strings.length - words.length; i++) {
        const matchesHere = words.every(
          (word, offset) => this.stringElementMatchesTerm(strings[i + offset], word)
        );

        if (!matchesHere) {
          continue;
        }

        for (let offset = 0; offset < words.length; offset++) {
          const box = this.createBoxFromElement(strings[i + offset]);
          if (box) {
            boxes.push(box);
          }
        }
      }
    }

    return boxes;
  }

  /**
   * Checks if a String element matches a search term
   * @param stringEl - ALTO String element
   * @param term - Normalized search term
   * @returns True if element matches term
   */
  private stringElementMatchesTerm(stringEl: Element, term: string): boolean {
    const content = this.normalizeWord(stringEl.getAttribute('CONTENT') || '');
    const subsContent = this.normalizeWord(stringEl.getAttribute('SUBS_CONTENT') || '');

    return content === term || subsContent === term;
  }

  /**
   * Creates a bounding box from an ALTO String element
   * Returns coordinates in ALTO pixel space (not scaled)
   * @param stringEl - ALTO String element
   * @returns Bounding box or null if coordinates are invalid
   */
  private createBoxFromElement(stringEl: Element): AltoBox | null {
    const width = parseInt(stringEl.getAttribute('WIDTH') || '0', 10);
    const height = parseInt(stringEl.getAttribute('HEIGHT') || '0', 10);
    const vpos = parseInt(stringEl.getAttribute('VPOS') || '0', 10);
    const hpos = parseInt(stringEl.getAttribute('HPOS') || '0', 10);

    if (width === 0 || height === 0) {
      return null;
    }

    // Return coordinates in ALTO pixel space
    return {
      x: hpos,
      y: vpos,
      width: width,
      height: height
    };
  }

  /**
   * Converts ALTO boxes to OpenSeadragon viewport coordinates
   * OpenSeadragon uses a coordinate system where width is normalized to 1.0
   * and height maintains the aspect ratio (height = imageHeight/imageWidth)
   *
   * @param boxes - Array of ALTO boxes in ALTO pixel coordinates
   * @param altoWidth - ALTO page width
   * @param altoHeight - ALTO page height
   * @param imageWidth - Actual image width
   * @param imageHeight - Actual image height
   * @returns Array of boxes in normalized OpenSeadragon coordinates
   */
  convertToViewportCoordinates(
    boxes: AltoBox[],
    altoWidth: number,
    altoHeight: number,
    imageWidth: number,
    imageHeight: number
  ): Array<{ x: number; y: number; width: number; height: number }> {
    if (altoWidth === 0 || altoHeight === 0 || imageWidth === 0 || imageHeight === 0) {
      console.warn('Invalid dimensions for viewport conversion', {
        altoWidth,
        altoHeight,
        imageWidth,
        imageHeight
      });
      return [];
    }

    // Calculate scale factors from ALTO to image coordinates
    const scaleX = imageWidth / altoWidth;
    const scaleY = imageHeight / altoHeight;

    return boxes.map(box => {
      // First scale from ALTO coordinates to image coordinates
      const imageX = box.x * scaleX;
      const imageY = box.y * scaleY;
      const imageW = box.width * scaleX;
      const imageH = box.height * scaleY;

      // Then normalize to OpenSeadragon coordinates
      // IMPORTANT: OpenSeadragon normalizes everything by image WIDTH
      // This makes the viewport width = 1.0 and height = aspectRatio
      const normalized = {
        x: imageX / imageWidth,
        y: imageY / imageWidth,      // Divide by WIDTH, not height
        width: imageW / imageWidth,
        height: imageH / imageWidth   // Divide by WIDTH, not height
      };

      return normalized;
    });
  }

  /**
   * Extracts all text from ALTO XML
   * Handles hyphenated words correctly by using SUBS_CONTENT
   * @param altoXml - ALTO XML string
   * @returns Extracted text as a single string
   */
  getFullText(altoXml: string): string {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(altoXml, 'text/xml');

    // Check for parsing errors
    const parserError = xmlDoc.querySelector('parsererror');
    if (parserError) {
      console.error('Error parsing ALTO XML:', parserError.textContent);
      return '';
    }

    let text = '';
    const textLines = Array.from(xmlDoc.getElementsByTagName('TextLine'));

    for (const textLine of textLines) {
      const strings = Array.from(textLine.getElementsByTagName('String'));

      for (const stringEl of strings) {
        let content = stringEl.getAttribute('CONTENT') || '';
        const subsContent = stringEl.getAttribute('SUBS_CONTENT') || '';
        const subsType = stringEl.getAttribute('SUBS_TYPE') || '';

        // Handle hyphenated words
        if (subsType === 'HypPart1') {
          content = subsContent;
        } else if (subsType === 'HypPart2') {
          // Skip the second part of hyphenated words as it's already in SUBS_CONTENT
          continue;
        }

        text += content + ' ';
      }
    }

    return text.trim();
  }

  /**
   * Extracts text within a specific bounding box from ALTO XML
   * @param altoXml - ALTO XML string
   * @param box - Bounding box coordinates [x1, y1, x2, y2] in image pixel coordinates
   * @param width - Image width for coordinate scaling
   * @param height - Image height for coordinate scaling
   * @returns Extracted text from within the box
   */
  getTextInBox(altoXml: string, box: number[], width: number, height: number): string {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(altoXml, 'text/xml');

    // Check for parsing errors
    const parserError = xmlDoc.querySelector('parsererror');
    if (parserError) {
      console.error('Error parsing ALTO XML:', parserError.textContent);
      return '';
    }

    const altoDims = this.getAltoDimensions(altoXml);
    const scaleX = width / altoDims.width;
    const scaleY = height / altoDims.height;

    // Convert box coordinates to ALTO coordinates
    // box format is [x1, y1, x2, y2]
    const w1 = box[0] / scaleX;  // left
    const w2 = box[2] / scaleX;  // right
    const h1 = box[1] / scaleY;  // top (y1)
    const h2 = box[3] / scaleY;  // bottom (y2)

    let text = '';
    const textLines = Array.from(xmlDoc.getElementsByTagName('TextLine'));

    for (const textLine of textLines) {
      const hpos = parseInt(textLine.getAttribute('HPOS') || '0', 10);
      const vpos = parseInt(textLine.getAttribute('VPOS') || '0', 10);
      const textLineWidth = parseInt(textLine.getAttribute('WIDTH') || '0', 10);
      const textLineHeight = parseInt(textLine.getAttribute('HEIGHT') || '0', 10);

      // Check if text line overlaps with the box (not strict containment)
      const lineRight = hpos + textLineWidth;
      const lineBottom = vpos + textLineHeight;

      if (hpos < w2 && lineRight > w1 &&
        vpos < h2 && lineBottom > h1) {

        const strings = Array.from(textLine.getElementsByTagName('String'));

        for (const stringEl of strings) {
          const stringHpos = parseInt(stringEl.getAttribute('HPOS') || '0', 10);
          const stringVpos = parseInt(stringEl.getAttribute('VPOS') || '0', 10);
          const stringWidth = parseInt(stringEl.getAttribute('WIDTH') || '0', 10);
          const stringHeight = parseInt(stringEl.getAttribute('HEIGHT') || '0', 10);

          // Check if string overlaps with the box
          const stringRight = stringHpos + stringWidth;
          const stringBottom = stringVpos + stringHeight;

          if (stringHpos < w2 && stringRight > w1 &&
            stringVpos < h2 && stringBottom > h1) {

            let content = stringEl.getAttribute('CONTENT') || '';
            const subsContent = stringEl.getAttribute('SUBS_CONTENT') || '';
            const subsType = stringEl.getAttribute('SUBS_TYPE') || '';

            // Handle hyphenated words
            if (subsType === 'HypPart1') {
              content = subsContent;
            } else if (subsType === 'HypPart2') {
              continue;
            }

            text += content + ' ';
          }
        }
      }
    }

    return text.trim();
  }

  /**
   * Converts ALTO XML to styled HTML, preserving font sizes, bold, and alignment
   * @param altoXml - ALTO XML string
   * @returns HTML string with inline styles
   */
  getStyledHtml(altoXml: string): string {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(altoXml, 'text/xml');

    const parserError = xmlDoc.querySelector('parsererror');
    if (parserError) {
      return '';
    }

    // Parse styles
    const textStyles = new Map<string, number>();
    for (const ts of Array.from(xmlDoc.getElementsByTagName('TextStyle'))) {
      textStyles.set(ts.getAttribute('ID') || '', parseFloat(ts.getAttribute('FONTSIZE') || '0'));
    }

    const paragraphStyles = new Map<string, string>();
    for (const ps of Array.from(xmlDoc.getElementsByTagName('ParagraphStyle'))) {
      paragraphStyles.set(ps.getAttribute('ID') || '', (ps.getAttribute('ALIGN') || 'Left').toLowerCase());
    }

    const htmlParts: string[] = [];

    const textLines = Array.from(xmlDoc.getElementsByTagName('TextLine'));
    let currentLines: string[] = [];
    let currentTag: 'p' | 'h1' | 'h2' | 'h3' = 'p';
    let currentAlign = 'left';
    let currentBaseFontSize = 0;
    let lastBottom = 0;
    let lastLeft = 0;

    const flushBlock = (): void => {
      if (currentLines.length === 0) {
        return;
      }

      const blockContent = currentLines.join(' ');
      const styles: string[] = [];

      if (currentAlign !== 'left') {
        styles.push(`text-align:${currentAlign}`);
      }
      if (currentTag === 'p' && currentBaseFontSize > 0) {
        styles.push(`font-size:${this.altoFontToCss(currentBaseFontSize)}`);
      }

      const styleAttr = styles.length > 0 ? ` style="${styles.join(';')}"` : '';
      htmlParts.push(`<${currentTag}${styleAttr}>${blockContent}</${currentTag}>`);

      currentLines = [];
      currentTag = 'p';
      currentAlign = 'left';
      currentBaseFontSize = 0;
      lastBottom = 0;
      lastLeft = 0;
    };

    for (const line of textLines) {
      const textLineWidth = parseInt(line.getAttribute('WIDTH') || '0', 10);
      if (textLineWidth < 50) {
        continue;
      }

      const textLineHeight = parseInt(line.getAttribute('HEIGHT') || '0', 10);
      const textLineVpos = parseInt(line.getAttribute('VPOS') || '0', 10);
      const textLineHpos = parseInt(line.getAttribute('HPOS') || '0', 10);
      const bottom = textLineVpos + textLineHeight;

      if (
        currentLines.length > 0 &&
        ((lastBottom > 0 && textLineVpos - lastBottom > 40) ||
          (lastLeft > 0 && textLineHpos - lastLeft > 40))
      ) {
        flushBlock();
      }

      const block = line.closest('TextBlock');
      const blockStyleRefs = (block?.getAttribute('STYLEREFS') || '').split(/\s+/).filter(Boolean);
      if (currentLines.length === 0) {
        currentAlign = 'left';
        currentBaseFontSize = 0;

        for (const ref of blockStyleRefs) {
          if (paragraphStyles.has(ref)) {
            currentAlign = paragraphStyles.get(ref) || 'left';
          }
          if (textStyles.has(ref)) {
            currentBaseFontSize = textStyles.get(ref) || 0;
          }
        }

        if (currentBaseFontSize > 18) {
          currentTag = 'h1';
        } else if (currentBaseFontSize > 11) {
          currentTag = 'h2';
        }
      }

      const lineStyleRefs = (line.getAttribute('STYLEREFS') || block?.getAttribute('STYLEREFS') || '')
        .split(/\s+/)
        .filter(Boolean);
      let lineFontSize = currentBaseFontSize;
      for (const ref of lineStyleRefs) {
        if (textStyles.has(ref)) {
          lineFontSize = textStyles.get(ref) || lineFontSize;
        }
      }

      const strings = Array.from(line.getElementsByTagName('String'));
      const words: Array<{ content: string; isBold: boolean; isItalic: boolean }> = [];
      let lineAllBold = true;

      for (const stringEl of strings) {
        let content = stringEl.getAttribute('CONTENT') || '';
        const subsContent = stringEl.getAttribute('SUBS_CONTENT') || '';
        const subsType = stringEl.getAttribute('SUBS_TYPE') || '';

        if (subsType === 'HypPart1') {
          content = subsContent;
        } else if (subsType === 'HypPart2') {
          continue;
        }

        const style = stringEl.getAttribute('STYLE') || '';
        const isBold = style.includes('bold');
        const isItalic = style.includes('italics');

        if (!isBold) {
          lineAllBold = false;
        }

        words.push({
          content,
          isBold,
          isItalic
        });
      }

      if (words.length === 0) {
        lastBottom = bottom;
        lastLeft = textLineHpos;
        continue;
      }

      const isHeadingLine = currentBaseFontSize > 11 || lineAllBold;
      let lineHtml = words
        .map(({ content, isBold, isItalic }) => {
          let word = escapeHtml(content);
          if (!isHeadingLine) {
            if (isBold) word = `<strong>${word}</strong>`;
            if (isItalic) word = `<em>${word}</em>`;
          }
          return word;
        })
        .join(' ');

      if (!isHeadingLine && currentTag === 'p' && lineFontSize > 0 && lineFontSize !== currentBaseFontSize) {
        lineHtml = `<span style="font-size:${this.altoFontToCss(lineFontSize)}">${lineHtml}</span>`;
      }

      currentLines.push(lineHtml);

      if (currentLines.length === 1 && lineAllBold && currentTag === 'p') {
        currentTag = 'h3';
      }

      lastBottom = bottom;
      lastLeft = textLineHpos;
    }

    flushBlock();

    return htmlParts.join('');
  }

  private altoFontToCss(altoSize: number): string {
    // ALTO font sizes from ABBYY are roughly in pt-like units
    // Scale relative to a base of ~12pt = 1em
    if (altoSize <= 8) return '0.75em';
    if (altoSize <= 10) return '0.875em';
    if (altoSize <= 13) return '1em';
    if (altoSize <= 16) return '1.25em';
    if (altoSize <= 20) return '1.5em';
    if (altoSize <= 30) return '2em';
    if (altoSize <= 40) return '2.5em';
    return '3em';
  }

  /**
   * Segments ALTO text into readable blocks for text-to-speech or reading purposes
   * @param altoXml - ALTO XML string
   * @returns Array of text blocks with their coordinates
   */
  getBlocksForReading(altoXml: string): AltoTextBlock[] {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(altoXml, 'text/xml');

    // Check for parsing errors
    const parserError = xmlDoc.querySelector('parsererror');
    if (parserError) {
      console.error('Error parsing ALTO XML:', parserError.textContent);
      return [];
    }

    const page = xmlDoc.getElementsByTagName('Page')[0];
    const printSpace = xmlDoc.getElementsByTagName('PrintSpace')[0];

    if (!printSpace) {
      return [];
    }

    let altoHeight = parseInt(page?.getAttribute('HEIGHT') || '0', 10);
    let altoWidth = parseInt(page?.getAttribute('WIDTH') || '0', 10);
    let altoHeight2 = parseInt(printSpace.getAttribute('HEIGHT') || '0', 10);
    let altoWidth2 = parseInt(printSpace.getAttribute('WIDTH') || '0', 10);

    let aw = 0;
    let ah = 0;

    if (altoHeight > 0 && altoWidth > 0) {
      aw = altoWidth;
      ah = altoHeight;
    } else if (altoHeight2 > 0 && altoWidth2 > 0) {
      aw = altoWidth2;
      ah = altoHeight2;
    }

    const blocks: AltoTextBlock[] = [];
    let block: AltoTextBlock = {
      text: '',
      hMin: 0,
      hMax: 0,
      vMin: 0,
      vMax: 0,
      width: aw,
      height: ah
    };

    const textLines = Array.from(xmlDoc.getElementsByTagName('TextLine'));
    let lines = 0;
    let lastBottom = 0;

    for (const textLine of textLines) {
      const textLineWidth = parseInt(textLine.getAttribute('WIDTH') || '0', 10);

      // Skip very narrow lines (likely artifacts)
      if (textLineWidth < 50) {
        continue;
      }

      const textLineHeight = parseInt(textLine.getAttribute('HEIGHT') || '0', 10);
      const textLineVpos = parseInt(textLine.getAttribute('VPOS') || '0', 10);
      const bottom = textLineVpos + textLineHeight;
      const diff = textLineVpos - lastBottom;

      // Detect paragraph breaks based on vertical spacing
      if (lastBottom > 0 && diff > 50) {
        if (block.text.length > 0) {
          block.text += '. -- -- ';
        }
      }

      lastBottom = bottom;
      lines += 1;

      const strings = Array.from(textLine.getElementsByTagName('String'));

      for (const stringEl of strings) {
        const stringHpos = parseInt(stringEl.getAttribute('HPOS') || '0', 10);
        const stringVpos = parseInt(stringEl.getAttribute('VPOS') || '0', 10);
        const stringWidth = parseInt(stringEl.getAttribute('WIDTH') || '0', 10);
        const stringHeight = parseInt(stringEl.getAttribute('HEIGHT') || '0', 10);

        // Update block boundaries
        if (block.hMin === 0 || block.hMin > stringHpos) {
          block.hMin = stringHpos;
        }
        if (block.hMax === 0 || block.hMax < stringHpos + stringWidth) {
          block.hMax = stringHpos + stringWidth;
        }
        if (block.vMin === 0 || block.vMin > stringVpos) {
          block.vMin = stringVpos;
        }
        if (block.vMax === 0 || block.vMax < stringVpos + stringHeight) {
          block.vMax = stringVpos + stringHeight;
        }

        const content = stringEl.getAttribute('CONTENT') || '';
        block.text += content;

        // Create a new block after meaningful sentence endings
        if (lines >= 3 && block.text.length > 120 &&
          (content.endsWith('.') || content.endsWith(';'))) {
          if (block.text.length > 0) {
            blocks.push(block);
          }
          block = {
            text: '',
            hMin: 0,
            hMax: 0,
            vMin: 0,
            vMax: 0,
            width: aw,
            height: ah
          };
          lines = 0;
        } else {
          block.text += ' ';
        }
      }
    }

    // Add the last block if it has content
    if (block.text.length > 0) {
      blocks.push(block);
    }

    return blocks;
  }
}
