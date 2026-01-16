import { Injectable } from '@angular/core';
import {
  Author,
  CartographicData,
  Metadata,
  PhysicalDescription,
  Publisher,
  TitleInfo,
  Location,
  NoteInfo,
} from '../models/metadata.model';
import { EnvironmentService } from './environment.service';
import { APP_LANG_TO_SOLR_SUFFIX, SOLR_LANG_TO_APP_LANG } from '../utils/language-utils';

@Injectable({
  providedIn: 'root'
})
export class ModsParserService {
  API_URL = '';

  private cache = new Map<string, Promise<Metadata>>();

  constructor(
    private env: EnvironmentService
  ) {

    this.API_URL = this.env.getApiUrl('items');

  }

  async getMods(uuid: string, type: 'full' | 'plain' = 'full'): Promise<Metadata> {
    const cacheKey = `${uuid}-${type}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    const url = `${this.API_URL}/${uuid}/metadata/mods`;

    const promise = fetch(url)
      .then(response => {
        if (!response.ok) {
          throw new Error(`Error fetching MODS data: ${response.statusText}`);
        }
        return response.text();
      })
      .then(modsXml => {
        const metadata = this.parseMods(modsXml, uuid, type);
        return metadata;
      })
      .catch(error => {
        console.error('Failed to fetch or parse MODS data:', error);
        this.cache.delete(cacheKey);
        throw error;
      });

    this.cache.set(cacheKey, promise);
    return promise;
  }

  private parseMods(modsXml: string, uuid: string, type: 'full' | 'plain'): Promise<Metadata> {
    return new Promise((resolve, reject) => {
      try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(modsXml, 'text/xml');

        // Check for parsing errors
        const parserError = xmlDoc.querySelector('parsererror');
        if (parserError) {
          reject(new Error('XML parsing error: ' + parserError.textContent));
          return;
        }

        if (type === 'plain') {
          resolve(this.createPlainMetadata(xmlDoc, uuid));
        } else {
          resolve(this.createMetadata(xmlDoc, uuid));
        }
      } catch (error) {
        reject(error);
      }
    });
  }

  private createMetadata(xmlDoc: Document, uuid: string): Metadata {
    const metadata = new Metadata();
    metadata.uuid = uuid;

    const modsElement = xmlDoc.querySelector('mods');
    if (!modsElement) return metadata;

    // Process all elements
    this.processTitles(this.getElements(modsElement, 'titleInfo'), metadata);
    this.processAuthors(this.getElements(modsElement, 'name'), metadata);
    this.processIdentifiers(this.getElements(modsElement, 'identifier'), metadata);
    this.processPublishers(this.getElements(modsElement, 'originInfo'), metadata);
    this.processLocations(this.getElements(modsElement, 'location'), metadata);
    this.processSubjects(this.getElements(modsElement, 'subject'), metadata);
    this.processLanguages(this.getElements(modsElement, 'language'), metadata);
    this.processRelatedItem(this.getElements(modsElement, 'relatedItem'), metadata);
    this.processParts(this.getElements(modsElement, 'part'), metadata);
    this.processReview(modsElement, metadata);
    this.processPhysicalDescriptions(this.getElements(modsElement, 'physicalDescription'), metadata);
    this.processNotes(this.getElements(modsElement, 'note'), metadata);
    this.processSimpleArray(this.getElements(modsElement, 'tableOfContents'), metadata.contents, null);
    this.processSimpleArray(this.getElements(modsElement, 'abstract'), metadata.abstracts, null);
    this.processSimpleArray(this.getElements(modsElement, 'genre'), metadata.genres, null);

    return metadata;
  }

  private createPlainMetadata(xmlDoc: Document, uuid: string): Metadata {
    const metadata = new Metadata();
    metadata.uuid = uuid;

    const modsElement = xmlDoc.querySelector('mods');
    if (!modsElement) return metadata;

    this.processAuthors(this.getElements(modsElement, 'name'), metadata);
    this.processLocations(this.getElements(modsElement, 'location'), metadata);
    this.processSubjects(this.getElements(modsElement, 'subject'), metadata);
    this.processLanguages(this.getElements(modsElement, 'language'), metadata);
    this.processParts(this.getElements(modsElement, 'part'), metadata);
    this.processPhysicalDescriptions(this.getElements(modsElement, 'physicalDescription'), metadata);
    this.processSimpleArray(this.getElements(modsElement, 'tableOfContents'), metadata.contents, null);
    this.processSimpleArray(this.getElements(modsElement, 'abstract'), metadata.abstracts, null);
    this.processSimpleArray(this.getElements(modsElement, 'genre'), metadata.genres, null);

    // Handle partName in titleInfo
    const titleInfoElements = this.getElements(modsElement, 'titleInfo');
    for (const titleInfo of titleInfoElements) {
      const partNameEl = titleInfo.querySelector('partName');
      if (partNameEl) {
        const title = this.getText(partNameEl);
        if (title) {
          const titleInfoObj = new TitleInfo();
          titleInfoObj.title = title;
          metadata.titles.push(titleInfoObj);
        }
      }
    }

    const hasAny =
      metadata.titles.length > 0 ||
      metadata.authors.length > 0 ||
      metadata.locations.length > 0 ||
      metadata.keywords.length > 0 ||
      metadata.languages.length > 0 ||
      metadata.physicalDescriptions.length > 0 ||
      metadata.notes.length > 0 ||
      metadata.contents.length > 0 ||
      metadata.abstracts.length > 0 ||
      metadata.genres.length > 0;

    return hasAny ? metadata : new Metadata();
  }

  private processTitles(elements: Element[], metadata: Metadata) {
    for (const item of elements) {
      const titleInfo = new TitleInfo();

      const lang = item.getAttribute('lang');
      if (lang) {
        titleInfo.lang = lang;
      }

      titleInfo.nonSort = this.getText(item.querySelector('nonSort'));
      titleInfo.title = this.getText(item.querySelector('title'));
      titleInfo.subTitle = this.getText(item.querySelector('subTitle'));
      titleInfo.partNumber = this.getText(item.querySelector('partNumber'));
      titleInfo.partName = this.getText(item.querySelector('partName'));

      metadata.titles.push(titleInfo);
    }
  }

  private processNotes(elements: Element[], metadata: Metadata) {
    for (const item of elements) {
      const noteInfo = new NoteInfo();

      const lang = item.getAttribute('lang');
      if (lang) {

        const mappedLang = SOLR_LANG_TO_APP_LANG[lang];

        if (mappedLang) {
          noteInfo.lang = mappedLang;
        }
      }

      noteInfo.text = this.replaceHTMLTags(this.getText(item) || '');

      metadata.notes.push(noteInfo);
    }
  }

  private processRelatedItem(elements: Element[], metadata: Metadata) {
    for (const item of elements) {
      this.processParts(this.getElements(item, 'part'), metadata);
    }
  }

  private processParts(elements: Element[], metadata: Metadata) {
    for (const item of elements) {
      const extentEl = item.querySelector('extent');
      if (extentEl) {
        const start = this.getText(extentEl.querySelector('start'));
        const end = this.getText(extentEl.querySelector('end'));
        const list = this.getText(extentEl.querySelector('list'));

        if (start && end) {
          metadata.extent = start + '-' + end;
        } else if (list) {
          metadata.extent = list;
        }
        return;
      }
    }
  }

  private processAuthors(elements: Element[], metadata: Metadata) {
    let anyPrimary = false;

    for (const item of elements) {
      const author = this.parseAuthor(item);
      if (author) {
        if (author.primary) {
          anyPrimary = true;
        }
        metadata.authors.push(author);
      }
    }

    if (!anyPrimary) {
      for (const author of metadata.authors) {
        author.primary = true;
      }
    }
  }

  private parseAuthor(item: Element): Author | null {
    const author = new Author();
    let given = '';
    let family = '';
    let termsOfAddress = '';

    const namePartElements = this.getElements(item, 'namePart');
    if (namePartElements.length === 0) {
      return null;
    }

    const type = item.getAttribute('type');
    if (type) {
      author.type = type;
    }

    const usage = item.getAttribute('usage');
    if (usage === 'primary') {
      author.primary = true;
    }

    for (const partName of namePartElements) {
      const partType = partName.getAttribute('type');
      const text = this.getText(partName);

      if (partType === 'given') {
        given = text;
      } else if (partType === 'family') {
        family = text;
      } else if (partType === 'termsOfAddress') {
        termsOfAddress = text;
      } else if (partType === 'date') {
        author.date = text;
      } else {
        if (author.name) {
          author.name += ' ' + text;
        } else {
          author.name = text;
        }
      }
    }

    let name = '';
    if (family) {
      name = family;
    }
    if (given) {
      if (name !== '') {
        name += ', ';
      }
      name += given;
    }
    if (name !== '') {
      author.name = name;
    }
    if (termsOfAddress) {
      if (author.name !== '') {
        author.name += ' ';
      }
      author.name += termsOfAddress;
    }

    // Process roles
    const roleElements = this.getElements(item, 'role');
    for (const role of roleElements) {
      const roleTermElements = this.getElements(role, 'roleTerm');
      for (const roleTerm of roleTermElements) {
        const roleText = this.getText(roleTerm);
        const roleType = roleTerm.getAttribute('type');
        if (roleText && roleType === 'code') {
          author.roles.push(roleText);
        }
      }
    }

    return author;
  }

  private processIdentifiers(elements: Element[], metadata: Metadata) {
    for (const item of elements) {
      const type = item.getAttribute('type');
      const invalid = item.getAttribute('invalid');
      let value = this.getText(item);

      if (!type || !value || invalid === 'yes') {
        continue;
      }

      if (type === 'doi' && !value.startsWith('http')) {
        value = 'https://doi.org/' + value;
      }

      if (metadata.identifiers[type]) {
        metadata.identifiers[type].push(value);
      } else {
        metadata.identifiers[type] = [value];
      }
    }
  }

  private processReview(modsElement: Element, metadata: Metadata) {
    metadata.reviews = [];
    let hasReview = false;

    const genreElements = this.getElements(modsElement, 'genre');
    for (const genre of genreElements) {
      if (genre.getAttribute('type') === 'review') {
        hasReview = true;
        break;
      }
    }

    if (!hasReview) {
      return;
    }

    const relatedItemElements = this.getElements(modsElement, 'relatedItem');
    if (relatedItemElements.length === 0) {
      return;
    }

    for (const ri of relatedItemElements) {
      const review = new Metadata();
      this.processTitles(this.getElements(ri, 'titleInfo'), review);
      this.processAuthors(this.getElements(ri, 'name'), review);
      this.processPublishers(this.getElements(ri, 'originInfo'), review);
      this.processLocations(this.getElements(ri, 'location'), review);
      this.processSubjects(this.getElements(ri, 'subject'), review);
      this.processParts(this.getElements(ri, 'part'), review);
      this.processLanguages(this.getElements(ri, 'language'), review);
      this.processNotes(this.getElements(ri, 'note'), review);
      this.processSimpleArray(this.getElements(ri, 'abstract'), review.abstracts, null);
      this.processSimpleArray(this.getElements(ri, 'genre'), review.genres, { key: 'authority', value: 'czenas' });

      metadata.reviews.push(review);
    }
  }

  private processPublishers(elements: Element[], metadata: Metadata) {
    for (const item of elements) {
      const publisher = new Publisher();
      publisher.name = this.getText(item.querySelector('publisher'));

      const placeElements = this.getElements(item, 'place');
      for (const place of placeElements) {
        const placeTermEl = place.querySelector('placeTerm');
        if (placeTermEl && placeTermEl.getAttribute('type') === 'text') {
          publisher.place = this.getText(placeTermEl);
        }
      }

      let dateFrom = null;
      let dateTo = null;
      let date = null;

      const dateIssuedElements = this.getElements(item, 'dateIssued');
      for (const dateIssued of dateIssuedElements) {
        const point = dateIssued.getAttribute('point');
        const dateText = this.getText(dateIssued);

        if (point === 'start') {
          dateFrom = dateText;
        } else if (point === 'end') {
          dateTo = dateText;
        } else {
          date = dateText;
        }
      }

      if (dateFrom && dateTo) {
        date = dateFrom + '-' + dateTo;
      }
      if (date && (date.endsWith('-9999') || date.endsWith('-uuuu'))) {
        date = date.substring(0, date.length - 4);
      }
      publisher.date = date;

      if (!publisher.date) {
        publisher.date = this.getText(item.querySelector('dateOther'));
      }

      if (!publisher.empty()) {
        metadata.publishers.push(publisher);
      }
    }
  }

  private processLocations(elements: Element[], metadata: Metadata) {
    for (const item of elements) {
      const location = new Location();
      location.physicalLocation = this.getFieldText(item, 'physicalLocation');
      location.shelfLocator = this.getFieldText(item, 'shelfLocator');

      if (!location.empty()) {
        metadata.locations.push(location);
      }
    }
  }

  private processPhysicalDescriptions(elements: Element[], metadata: Metadata) {
    for (const item of elements) {
      const noteElements = this.getElements(item, 'note');
      const extent = this.getText(item.querySelector('extent'));

      if (noteElements.length > 0) {
        const firstNote = this.getText(noteElements[0]);
        const desc = new PhysicalDescription(firstNote, extent);
        if (!desc.empty()) {
          metadata.physicalDescriptions.push(desc);
        }

        // Process additional notes
        for (let i = 1; i < noteElements.length; i++) {
          const note = this.getText(noteElements[i]);
          if (note) {
            metadata.physicalDescriptions.push(new PhysicalDescription(note));
          }
        }
      } else if (extent) {
        const desc = new PhysicalDescription('', extent);
        if (!desc.empty()) {
          metadata.physicalDescriptions.push(desc);
        }
      }

      // Process form elements
      const formElements = this.getElements(item, 'form');
      for (const form of formElements) {
        const text = this.getText(form);
        if (text) {
          const desc = new PhysicalDescription(text);
          metadata.physicalDescriptions.push(desc);
        }
      }
    }
  }

  private processSubjects(elements: Element[], metadata: Metadata) {
    for (const item of elements) {
      // Process topics
      const topicElements = this.getElements(item, 'topic');
      for (const topic of topicElements) {
        const text = this.getText(topic);
        if (text && metadata.keywords.indexOf(text) < 0) {
          metadata.keywords.push(text);
        }
      }

      // Process geographic
      const geographicElements = this.getElements(item, 'geographic');
      for (const geographic of geographicElements) {
        const text = this.getText(geographic);
        if (text && metadata.geonames.indexOf(text) < 0) {
          metadata.geonames.push(text);
        }
      }

      // Process temporals
      const temporalElements = this.getElements(item, 'temporal');
      for (const temporal of temporalElements) {
        const text = this.getText(temporal);
        if (text && metadata.subjectTemporals.indexOf(text) < 0) {
          metadata.subjectTemporals.push(text);
        }
      }

      // Process names inside subjects
      const nameElements = this.getElements(item, 'name');
      for (const nameEl of nameElements) {
        const author = this.parseAuthor(nameEl);
        if (author) {
          if (author.type === 'personal') {
            metadata.subjectNamesPersonal.push(author);
          } else if (author.type === 'corporate') {
            metadata.subjectNamesCorporate.push(author);
          }
        }
      }

      // Process cartographics
      const cartographicsElements = this.getElements(item, 'cartographics');
      for (const cartographics of cartographicsElements) {
        const cd = new CartographicData();
        const scale = this.getText(cartographics.querySelector('scale'));
        const coordinates = this.getText(cartographics.querySelector('coordinates'));

        if (scale) {
          cd.scale = scale;
        }
        if (coordinates) {
          cd.coordinates = coordinates;
        }

        if (!cd.empty()) {
          metadata.cartographicData.push(cd);
        }
      }
    }
  }


  private processLanguages(elements: Element[], metadata: Metadata) {
    for (const item of elements) {
      const languageTermEl = item.querySelector('languageTerm');
      if (languageTermEl) {
        const type = languageTermEl.getAttribute('type');
        const authority = languageTermEl.getAttribute('authority');

        if (type === 'code' && authority === 'iso639-2b') {
          const lang = this.getText(languageTermEl);
          if (lang && lang.length > 0) {
            metadata.languages.push(lang);
          }
        }
      }
    }
  }

  private getFieldText(parent: Element, tagName: string): string {
    let el = parent.querySelector(tagName);
    if (!el) {
      el = parent.querySelector('mods\\:' + tagName);
    }
    return this.getText(el);
  }

  private getText(element: Element | null): string {
    if (element) {
      return element.textContent?.trim() || '';
    }
    return '';
  }

  private getElements(parent: Element, tagName: string): Element[] {
    return Array.from(parent.querySelectorAll(`:scope > ${tagName}`));
  }

  private processSimpleArray(elements: Element[], output: string[], param: { key: string; value: string } | null) {
    for (const item of elements) {
      const text = this.getText(item);
      const shouldInclude = !param || item.getAttribute(param.key) === param.value;

      if (text && !output.includes(text) && shouldInclude) {
        output.push(
          this.replaceHTMLTags(text)
        );
      }
    }
  }

  private replaceHTMLTags(text: string): string {
    return text.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"');
  }
}
