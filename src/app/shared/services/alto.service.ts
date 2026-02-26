import { Injectable } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { Observable } from 'rxjs';
import { EnvironmentService } from './environment.service';
import { SKIP_ERROR_INTERCEPTOR } from '../../core/services/http-context-tokens';

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
    private env: EnvironmentService
  ) { }

  private get API_URL(): string {
    const url = this.env.getBaseApiUrl();
    if (!url) {
      console.warn('AltoService: API URL not available. Environment may not be loaded yet.');
      return '';
    }
    return url;
  }

  /**
   * Fetches ALTO XML for a specific page
   * @param pid - Page identifier
   * @returns Observable with ALTO XML string
   */
  fetchAltoXml(pid: string): Observable<string> {
    const url = `${this.API_URL}/search/api/client/v7.0/items/${pid}/ocr/alto`;
    return this.http.get(url, {
      responseType: 'text',
      context: new HttpContext().set(SKIP_ERROR_INTERCEPTOR, true)
    });
  }

  /**
   * Parses ALTO XML and extracts bounding boxes for matched words
   * Returns boxes in ALTO pixel coordinates
   * @param altoXml - ALTO XML string
   * @param searchTerms - Array of search terms or space-separated string
   * @returns Array of bounding boxes in ALTO pixel coordinates
   */
  getBoxes(
    altoXml: string,
    searchTerms: string | string[]
  ): AltoBox[] {
    const terms = this.normalizeSearchTerms(searchTerms);
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
   * Normalizes search terms by removing special characters and converting to lowercase
   * @param searchTerms - Search terms as string or array
   * @returns Array of normalized search terms
   */
  private normalizeSearchTerms(searchTerms: string | string[]): string[] {
    let terms: string[];

    if (typeof searchTerms === 'string') {
      // Remove fuzzy search notation (e.g., "word~" becomes "word")
      let cleanedQuery = searchTerms;
      if (cleanedQuery.includes('~')) {
        cleanedQuery = cleanedQuery.substring(0, cleanedQuery.indexOf('~'));
      }
      // Split by spaces and remove quotes
      terms = cleanedQuery.replace(/"/g, '').split(/\s+/);
    } else {
      terms = searchTerms;
    }

    // Normalize each term
    return terms
      .map(term => this.normalizeWord(term))
      .filter(term => term.length > 0);
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
   * @param strings - Array of String elements from ALTO XML
   * @param searchTerms - Normalized search terms
   * @returns Array of bounding boxes in ALTO coordinates
   */
  private extractBoxesFromStrings(
    strings: Element[],
    searchTerms: string[]
  ): AltoBox[] {
    const boxes: AltoBox[] = [];

    for (const term of searchTerms) {
      for (const stringEl of strings) {
        if (this.stringElementMatchesTerm(stringEl, term)) {
          const box = this.createBoxFromElement(stringEl);
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
