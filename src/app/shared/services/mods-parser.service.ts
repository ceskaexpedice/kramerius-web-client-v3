// import { Injectable } from '@angular/core';
// import {Author, Metadata, Publisher, TitleInfo} from '../models/metadata.model';
//
// @Injectable({
//   providedIn: 'root'
// })
// export class ModsParserService {
//
//   private readonly API_URL = 'https://api.kramerius.mzk.cz/search/api/client/v7.0/items';
//
//   constructor() { }
//
//   getMods(uuid: string) {
//     const url = `${this.API_URL}/${uuid}/metadata/mods`;
//     return fetch(url)
//       .then(response => {
//         if (!response.ok) {
//           throw new Error(`Error fetching MODS data: ${response.statusText}`);
//         }
//         return response.text();
//       })
//       .then(modsXml => this.parseMods(modsXml))
//       .catch(error => {
//         console.error('Failed to fetch or parse MODS data:', error);
//         throw error;
//       });
//   }
//
//   private parseMods(modsXml: string): Metadata {
//     const parser = new DOMParser();
//     const xml = parser.parseFromString(modsXml, 'text/xml');
//
//     const metadata = new Metadata();
//
//     const mods = xml.getElementsByTagName('mods')[0];
//
//     if (!mods) {
//       console.warn('No MODS root element found in the XML');
//       return metadata; // Return empty metadata if no mods element is found
//     }
//     if (!mods) return metadata;
//
//     console.log('mods', mods);
//
//     this.parseTitles(mods, metadata);
//     this.parseAuthors(mods, metadata);
//     this.parsePublishers(mods, metadata);
//     this.parseLanguages(mods, metadata);
//     // ... ďalšie podľa potreby
//
//     return metadata;
//   }
//
//   private parseTitles(mods: Element, metadata: Metadata) {
//     const titleInfos = mods.getElementsByTagName('titleInfo');
//
//     for (let i = 0; i < titleInfos.length; i++) {
//       const titleInfo = titleInfos[i];
//       const title = titleInfo.getElementsByTagName('title')[0]?.textContent?.trim() ?? '';
//       const subTitle = titleInfo.getElementsByTagName('subTitle')[0]?.textContent?.trim() ?? '';
//       const partNumber = titleInfo.getElementsByTagName('partNumber')[0]?.textContent?.trim() ?? '';
//       const partName = titleInfo.getElementsByTagName('partName')[0]?.textContent?.trim() ?? '';
//       const nonSort = titleInfo.getElementsByTagName('nonSort')[0]?.textContent?.trim() ?? '';
//
//       const titleItem = new TitleInfo();
//       titleItem.title = title;
//       titleItem.subTitle = subTitle;
//       titleItem.partName = partName;
//       titleItem.partNumber = partNumber;
//       titleItem.nonSort = nonSort;
//       titleItem.lang = titleInfo.getAttribute('lang') ?? '';
//
//       metadata.titles.push(titleItem);
//     }
//   }
//
//   private parseAuthors(mods: Element, metadata: Metadata) {
//     const names = mods.getElementsByTagName('name');
//     let hasPrimary = false;
//
//     for (let i = 0; i < names.length; i++) {
//       const nameEl = names[i];
//       const author = new Author();
//
//       const usage = nameEl.getAttribute('usage');
//       const type = nameEl.getAttribute('type');
//       if (usage === 'primary') {
//         author.primary = true;
//         hasPrimary = true;
//       }
//       if (type) {
//         author.type = type;
//       }
//
//       const nameParts = nameEl.getElementsByTagName('namePart');
//       for (let j = 0; j < nameParts.length; j++) {
//         const np = nameParts[j];
//         const text = np.textContent?.trim() ?? '';
//         const npType = np.getAttribute('type');
//
//         switch (npType) {
//           case 'given': author.name = (author.name ? author.name + ' ' : '') + text; break;
//           case 'family': author.name = text + (author.name ? ', ' + author.name : ''); break;
//           case 'termsOfAddress': author.name += ' ' + text; break;
//           case 'date': author.date = text; break;
//           default: author.name = author.name ? author.name + ' ' + text : text;
//         }
//       }
//
//       const roleTerms = nameEl.getElementsByTagName('roleTerm');
//       for (let j = 0; j < roleTerms.length; j++) {
//         const rt = roleTerms[j];
//         if (rt.getAttribute('type') === 'code') {
//           const role = rt.textContent?.trim();
//           if (role) {
//             author.roles.push(role);
//           }
//         }
//       }
//
//       metadata.authors.push(author);
//     }
//
//     // Fallback – ak nikto nie je označený ako primary
//     if (!hasPrimary && metadata.authors.length > 0) {
//       metadata.authors[0].primary = true;
//     }
//   }
//
//   private parsePublishers(mods: Element, metadata: Metadata) {
//     const originInfos = mods.getElementsByTagName('originInfo');
//
//     for (let i = 0; i < originInfos.length; i++) {
//       const origin = originInfos[i];
//       const publisher = new Publisher();
//
//       // Názov vydavateľa
//       publisher.name = this.getTextContent(origin, 'publisher') ?? '';
//
//       // Miesto vydania
//       const places = origin.getElementsByTagName('place');
//       for (let j = 0; j < places.length; j++) {
//         const placeTerms = places[j].getElementsByTagName('placeTerm');
//         // Convert HTMLCollection to Array or use traditional for loop
//         for (let k = 0; k < placeTerms.length; k++) {
//           const pt = placeTerms[k];
//           if (pt.getAttribute('type') === 'text') {
//             publisher.place = pt.textContent?.trim() ?? '';
//           }
//         }
//       }
//
//
//       // Rok vydania
//       let date = '';
//       const dateIssuedEls = origin.getElementsByTagName('dateIssued');
//       for (let j = 0; j < dateIssuedEls.length; j++) {
//         const dateEl = dateIssuedEls[j];
//         const point = dateEl.getAttribute('point');
//         const val = dateEl.textContent?.trim();
//
//         if (point === 'start') {
//           date += val ? val + '-' : '';
//         } else if (point === 'end') {
//           date += val ?? '';
//         } else if (!point && val) {
//           date = val;
//         }
//       }
//
//       // Odstráň zbytočné koncovky typu -9999
//       if (date.endsWith('-9999') || date.endsWith('-uuuu')) {
//         date = date.slice(0, -5);
//       }
//
//       if (!date) {
//         date = this.getTextContent(origin, 'dateOther') ?? '';
//       }
//
//       publisher.date = date;
//
//       // Ak nie je prázdny, pridaj do metadát
//       if (!publisher.empty()) {
//         metadata.publishers.push(publisher);
//       }
//     }
//   }
//
//   private parseLanguages(mods: Element, metadata: Metadata) {
//     const languages = mods.getElementsByTagName('language');
//
//     for (let i = 0; i < languages.length; i++) {
//       const langEl = languages[i];
//       const terms = langEl.getElementsByTagName('languageTerm');
//
//       for (let j = 0; j < terms.length; j++) {
//         const term = terms[j];
//         const type = term.getAttribute('type');
//         const authority = term.getAttribute('authority');
//
//         if (type === 'code' && authority === 'iso639-2b') {
//           const value = term.textContent?.trim();
//           if (value && !metadata.languages.includes(value)) {
//             metadata.languages.push(value);
//           }
//         }
//       }
//     }
//   }
//
//
//   private getTextContent(parent: Element, tagName: string): string | null {
//     const el = parent.getElementsByTagName(tagName)[0];
//     return el?.textContent?.trim() ?? null;
//   }
//
//   private getChildElements(parent: Element, tagName: string): Element[] {
//     return Array.from(parent.getElementsByTagName(tagName));
//   }
//
//   private getDirectChildren(parent: Element, tagName: string): Element[] {
//     return Array.from(parent.children).filter(el => el.tagName === tagName) as Element[];
//   }
//
//
// }

import { Injectable } from '@angular/core';
import { parseString, processors } from 'xml2js';
import {Author, CartographicData, Metadata, PhysicalDescription, Publisher, TitleInfo, Location} from '../models/metadata.model';

@Injectable({
  providedIn: 'root'
})
export class ModsParserService {
  private readonly API_URL = 'https://api.kramerius.mzk.cz/search/api/client/v7.0/items';

  constructor() {}

  getMods(uuid: string, type: 'full' | 'plain' = 'full'): Promise<Metadata> {
    const url = `${this.API_URL}/${uuid}/metadata/mods`;

    return fetch(url)
      .then(response => {
        if (!response.ok) {
          throw new Error(`Error fetching MODS data: ${response.statusText}`);
        }
        return response.text();
      })
      .then(modsXml => this.parseMods(modsXml, uuid, type))
      .catch(error => {
        console.error('Failed to fetch or parse MODS data:', error);
        throw error;
      });
  }

  private parseMods(modsXml: string, uuid: string, type: 'full' | 'plain'): Promise<Metadata> {
    const options = {
      tagNameProcessors: [processors.stripPrefix],
      explicitCharkey: true
    };

    return new Promise((resolve, reject) => {
      parseString(modsXml, options, (err, result) => {
        if (err) {
          reject(err);
        } else {
          if (type === 'plain') {
            resolve(this.createPlainMetadata(result, uuid));
          } else {
            resolve(this.createMetadata(result, uuid));
          }
        }
      });
    });
  }

  private createMetadata(mods: any, uuid: string): Metadata {
    const metadata = new Metadata();
    metadata.uuid = uuid;
    const root = mods?.modsCollection?.mods?.[0];
    if (!root) return metadata;

    // Tu voláš tvoje pôvodné metódy:
    this.processTitles(root.titleInfo, metadata);
    this.processAuthors(root.name, metadata);
    this.processIdentifiers(root.identifier, metadata);
    this.processPublishers(root.originInfo, metadata);
    this.processLocations(root.location, metadata);
    this.processSubjects(root.subject, metadata);
    this.processLanguages(root.language, metadata);
    this.processRelatedItem(root.relatedItem, metadata);
    this.processParts(root.part, metadata);
    this.processReview(root, metadata);
    this.processPhysicalDescriptions(root.physicalDescription, metadata);
    this.processSimpleArray(root.note, metadata.notes, null);
    this.processSimpleArray(root.tableOfContents, metadata.contents, null);
    this.processSimpleArray(root.abstract, metadata.abstracts, null);
    this.processSimpleArray(root.genre, metadata.genres, { key: 'authority', value: 'czenas' });

    return metadata;
  }

  private createPlainMetadata(mods: any, uuid: string): Metadata {
    const metadata = new Metadata();
    metadata.uuid = uuid;
    const root = mods?.modsCollection?.mods?.[0];
    if (!root) return metadata;

    this.processAuthors(root.name, metadata);
    this.processLocations(root.location, metadata);
    this.processSubjects(root.subject, metadata);
    this.processLanguages(root.language, metadata);
    this.processParts(root.part, metadata);
    this.processPhysicalDescriptions(root.physicalDescription, metadata);
    this.processSimpleArray(root.note, metadata.notes, null);
    this.processSimpleArray(root.tableOfContents, metadata.contents, null);
    this.processSimpleArray(root.abstract, metadata.abstracts, null);
    this.processSimpleArray(root.genre, metadata.genres, { key: 'authority', value: 'czenas' });

    if (root.titleInfo?.[0]?.partName) {
      const title = this.getText(root.titleInfo[0].partName);
      if (title) {
        const titleInfo = new TitleInfo();
        titleInfo.title = title;
        metadata.titles.push(titleInfo);
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

  private processTitles(array: any[], metadata: Metadata) {
    if (!array) {
      return;
    }
    for (const item of array) {
      const titleInfo = new TitleInfo();
      if (item['$'] && item['$']['lang']) {
        titleInfo.lang = item['$']['lang'];
      }
      titleInfo.nonSort = this.getText(item.nonSort);
      titleInfo.title = this.getText(item.title);
      titleInfo.subTitle = this.getText(item.subTitle);
      titleInfo.partNumber = this.getText(item.partNumber);
      titleInfo.partName = this.getText(item.partName);
      metadata.titles.push(titleInfo);
    }
  }

  private processRelatedItem(array: any[], metadata: Metadata) {
    if (!array) {
      return;
    }
    for (const item of array) {
      this.processParts(item['part'], metadata);
    }
  }


  private processParts(array: any[], metadata: Metadata) {
    if (!array) {
      return;
    }
    for (const item of array) {
      if (item.extent && item.extent[0]) {
        const extent = item.extent[0];
        const start = this.getText(extent.start);
        const end = this.getText(extent.end);
        const list = this.getText(extent.list);

        if (start && end) {
          metadata.extent = start + '-' + end;
        } else if (list) {
          metadata.extent = list;
        }
        return;
      }
    }
  }

  private processAuthors(array: any[], metadata: Metadata) {
    if (!array) {
      return;
    }
    let anyPrimary = false;
    for (const item of array) {
      const author = new Author();
      let given;
      let family;
      let termsOfAddress;
      if (!item.namePart) {
        continue;
      }
      if (item['$'] && item['$']['type']) {
        author.type = item['$']['type'];
      }
      if (item['$'] && item['$']['usage'] === 'primary') {
        anyPrimary = true;
        author.primary = true;
      }
      for (const partName of item.namePart) {
        if (partName['$'] && partName['$']['type']) {
          const type = partName['$']['type'];
          if (type === 'given') {
            given = partName['_'];
          } else if (type === 'family') {
            family = partName['_'];
          } else if (type === 'termsOfAddress') {
            termsOfAddress = partName['_'];
          } else if (type === 'date') {
            author.date = partName['_'];
          }
        } else {
          if (author.name) {
            author.name += ' ' + partName['_'];
          } else {
            author.name = partName['_'];
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
      if (item.role) {
        for (const role of item.role) {
          if (role['roleTerm']) {
            for (const roleTerm of role['roleTerm']) {
              const r = roleTerm['_'];
              if (r && this.hasAttribute(roleTerm, 'type', 'code')) {
                author.roles.push(r);
              }
            }
          }
        }
      }
      metadata.authors.push(author);
    }
    if (!anyPrimary) {
      for (const author of metadata.authors) {
        author.primary = true;
      }
    }
  }


  private processIdentifiers(array: any[], metadata: Metadata) {
    if (!array) {
      return;
    }
    for (const item of array) {
      if (item['$'] && item['$']['type']) {
        const type = item['$']['type'];
        const invalid = item['$']['invalid'];
        let value = String(item['_']);
        if (!type || !value || invalid == 'yes') {
          continue;
        }
        if (type == 'doi' && !value.startsWith('http')) {
          value = 'https://doi.org/' + value;
        }
        if (metadata.identifiers[type]) {
          metadata.identifiers[type].push(value)
        } else {
          metadata.identifiers[type] = [value];
        }
      }
    }
  }

  private processReview(mods: any, metadata: Metadata) {
    metadata.reviews = [];
    let hasReview = false;
    if (!mods['genre']) {
      return;
    }
    for (const genre of mods['genre']) {
      if (this.hasAttribute(genre, 'type', 'review')) {
        hasReview = true;
        break;
      }
    }
    if (!hasReview) {
      return;
    }
    const ris = mods['relatedItem'];
    if (!ris || ris.length === 0) {
      return;
    }
    for (const ri of ris) {
      const review = new Metadata();
      this.processTitles(ri['titleInfo'], review);
      this.processAuthors(ri['name'], review);
      this.processPublishers(ri['originInfo'], review);
      this.processLocations(ri['location'], review);
      this.processSubjects(ri['subject'], review);
      this.processParts(ri['part'], review);
      this.processLanguages(ri['language'], review);
      this.processSimpleArray(ri['note'], review.notes, null);
      this.processSimpleArray(ri['abstract'], review.abstracts, null);
      this.processSimpleArray(ri['genre'], review.genres, { key: 'authority', value: 'czenas' });
      // if (ri['$'] && ri['$']['displayLabel'] === 'Recenze na:') {
      //     metadata.review = review;
      //     return;
      // }
      metadata.reviews.push(review);
    }
    // metadata.review = review;
  }


  private processPublishers(array: any[], metadata: Metadata) {
    if (!array) {
      return;
    }
    for (const item of array) {
      const publisher = new Publisher();
      publisher.name = this.getText(item.publisher);
      if (item.place) {
        for (const place of item.place) {
          if (!(place.placeTerm && place.placeTerm[0])) {
            continue;
          }
          const placeTerm = place.placeTerm[0];
          if (this.hasAttribute(placeTerm, 'type', 'text')) {
            publisher.place = this.getText(placeTerm);
          }
        }
      }
      let dateFrom = null;
      let dateTo = null;
      let date = null;
      if (item.dateIssued) {
        for (const dateIssued of item.dateIssued) {
          if (this.hasAttribute(dateIssued, 'point', 'start')) {
            dateFrom = this.getText(dateIssued);
          } else if (this.hasAttribute(dateIssued, 'point', 'end')) {
            dateTo = this.getText(dateIssued);
          } else {
            date = this.getText(dateIssued);
          }
        }
        if (dateFrom && dateTo) {
          date = dateFrom + '-' + dateTo;
        }
        if (date && (date.endsWith('-9999') || date.endsWith('-uuuu'))) {
          date = date.substring(0, date.length - 4);
        }
        publisher.date = date;
      }
      if (!publisher.date) {
        publisher.date = this.getText(item.dateOther);
      }
      if (!publisher.empty()) {
        metadata.publishers.push(publisher);
      }
    }
  }


  private processLocations(array: any[], metadata: Metadata) {
    if (!array) {
      return;
    }
    for (const item of array) {
      const location = new Location();
      location.physicalLocation = this.getText(item.physicalLocation);
      location.shelfLocator = this.getText(item.shelfLocator);
      if (!location.empty()) {
        metadata.locations.push(location);
      }
    }
  }


  private processPhysicalDescriptions(array: any[], metadata: Metadata) {
    if (!array) {
      return;
    }
    for (const item of array) {
      const desc = new PhysicalDescription(this.getText(item.note), this.getText(item.extent));
      if (!desc.empty()) {
        metadata.physicalDescriptions.push(desc);
      }
      if (item.note && Array.isArray(item.note) && item.note.length > 1) {
        for (let i = 1; i < item.note.length; i++) {
          const note = this.getText(item.note[i]);
          if (note) {
            metadata.physicalDescriptions.push(new PhysicalDescription(note));
          }
        }
      }
    }
  }


  private processSubjects(array: any[], metadata: Metadata) {
    if (!array) {
      return;
    }
    for (const item of array) {
      if (item.topic) {
        for (const topic of item.topic) {
          const text = this.getText(topic);
          if (text && metadata.keywords.indexOf(text) < 0) {
            metadata.keywords.push(text);
          }
        }
      }
      if (item.geographic) {
        for (const geographic of item.geographic) {
          const text = this.getText(geographic);
          if (text && metadata.geonames.indexOf(text) < 0) {
            metadata.geonames.push(text);
          }
        }
      }
      if (item.cartographics) {
        const cartographics = item.cartographics;
        const cd = new CartographicData();
        if (Array.isArray(cartographics)) {
          for (const c of cartographics) {
            const scale = this.getText(c.scale);
            const coordinates = this.getText(c.coordinates);
            if (scale) {
              cd.scale = scale;
            }
            if (coordinates) {
              cd.coordinates = coordinates;
            }
          }
        }
        if (!cd.empty()) {
          metadata.cartographicData.push(cd);
        }
      }
    }

  }

  private processLanguages(array: any[], metadata: Metadata) {
    if (!array) {
      return;
    }
    for (const item of array) {
      if (item.languageTerm && item.languageTerm[0] && item.languageTerm[0]['$']) {
        const elem = item.languageTerm;
        const params = elem[0]['$'];
        if (params['type'] === 'code' && params['authority'] === 'iso639-2b') {
          const lang = this.getText(elem);
          if (lang && lang.length > 0) {
            metadata.languages.push(lang);
          }
        }
      }
    }
  }

  private getText(element: any): string {
    if (element) {
      let el = '';
      if (Array.isArray(element)) {
        el = element[0]['_'];
      } else {
        el = element['_'];
      }
      if (el) {
        return el.trim();
      }
    }
    return '';
  }

  private hasAttribute(element: any, attr: string, value: string): boolean {
    const params = element['$'];
    return !!(params && params[attr] === value);
  }

  private processSimpleArray(array: any, output: string[], param: { key: string; value: string } | null) {
    if (!array) return;
    for (const item of array) {
      const text = item['_'];
      if (text && !output.includes(text) && (!param || (item['$'] && item['$'][param.key] === param.value))) {
        output.push(
          text.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"')
        );
      }
    }
  }

  // ... ostatné pôvodné processXYZ funkcie doplň sem
}


