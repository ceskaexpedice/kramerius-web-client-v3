import { Page } from './page.model';
import { Article } from './article.model';
import { PeriodicalItem } from './periodicalItem.model';
import { InternalPart } from './internal_part.model';
import { selectPrimaryLicense } from '../../core/solr/solr-misc';

export class Metadata {
  public context: any = {};
  public uuid: string = '';
  public titles: TitleInfo[] = [];
  public authors: Author[] = [];
  public publishers: Publisher[] = [];
  public extent: string = '';
  public keywords: string[] = [];
  public geonames: string[] = [];
  public notes: NoteInfo[] = [];
  public languages: string[] = [];
  public locations: Location[] = [];
  public abstracts: string[] = [];
  public genres: string[] = [];
  public contents: string[] = [];
  public cartographicData: CartographicData[] = [];
  public physicalDescriptions: PhysicalDescription[] = [];
  public identifiers: any = {};

  public subjectNamesPersonal: Author[] = [];
  public subjectNamesCorporate: Author[] = [];
  public subjectTemporals: string[] = [];

  public model: string = '';
  public doctype: string = '';
  public volume: Volume = new Volume('', '', '');

  public isPublic: boolean = true;
  public licences: string[] = [];
  public licence: string = '';

  public mainTitle: string = '';
  public donators: string[] = [];

  public activePages: string = '';
  public activePage: Page | null = null;
  public activePageRight: Page | null = null;

  public originUrl: string = '';

  public inCollections: InCollections[] = [];
  public inCollectionsDirect: InCollections[] = [];

  public dateStr: string = '';
  public dateMin: string = '';
  public dateMax: string = '';
  public dateRangeStartYear?: number;
  public dateRangeStartMonth?: number;
  public dateRangeStartDay?: number;
  public dateRangeEndYear?: number;
  public dateRangeEndMonth?: number;
  public dateRangeEndDay?: number;

  public hasTiles: boolean = false;
  public level?: number;

  public created: string = '';
  public modified: string = '';

  public rootModel: string = '';
  public rootPid: string = '';
  public ownParentPid: string = '';
  public ownParentModel: string = '';

  public pidPaths: string[] = [];
  public ownPidPath: string = '';

  public partNumberSort?: number;

  public currentIssue: PeriodicalItem | null = null;
  public nextIssue: PeriodicalItem | null = null;
  public previousIssue: PeriodicalItem | null = null;

  public currentVolume: PeriodicalItem | null = null;
  public nextVolume: PeriodicalItem | null = null;
  public previousVolume: PeriodicalItem | null = null;

  public currentUnit: any = null;
  public nextUnit: any = null;
  public previousUnit: any = null;

  public article: Article | null = null;
  public internalPart: InternalPart | null = null;
  public reviews: Metadata[] = [];
  public volumeMetadata: Metadata | null = null;
  public extraParentMetadata: Metadata | null = null;

  public pdf: boolean = false;
  public epub: boolean = false;

  // Collection-specific fields (empty/null for non-collection documents)
  public collectionDescription: string = '';
  public collectionDescriptions: { [lang: string]: string } = {};
  public collectionTitles: { [lang: string]: string } = {};
  public collectionIsStandalone: boolean = false;

  public monographUnitCount: number = 0;
}

export class TitleInfo {
  public lang: string = '';
  public nonSort: string = '';
  public title: string = '';
  public subTitle: string = '';
  public partName: string = '';
  public partNumber: string = '';
}

export class NoteInfo {
  public lang: string = '';
  public text: string = '';
}

export class Volume {
  constructor(public uuid: string = '', public year: string = '', public number: string = '') { }
}

export class Author {
  public type: string = '';
  public usage: string = '';
  public name: string = '';
  public nameForFilter: string = '';
  public date: string = '';
  public roles: string[] = [];
  public primary: boolean = false;
  public identifiers: { type: string; value: string }[] = [];

  constructor() {
    this.roles = [];
    this.identifiers = [];
  }
}

export class Location {
  public shelfLocator: string = '';
  public physicalLocation: string = '';

  empty() {
    return !(this.shelfLocator || this.physicalLocation);
  }
}

export class PhysicalDescription {
  constructor(public note: string = '', public extent: string = '') { }

  empty() {
    return !(this.extent || this.note);
  }
}

export class CartographicData {
  public scale: string = '';
  public coordinates: string = '';

  empty() {
    return !(this.scale || this.coordinates);
  }
}

export class Publisher {
  public name: string = '';
  public date: string | null = '';
  public place: string = '';

  placeAndName(): string {
    let s = '';
    if (this.place) {
      s += this.place;
      if (s.endsWith(':')) {
        s = s.substring(0, s.length - 1);
      }
      s = s.trim();
    }
    if (this.name) {
      if (this.place) {
        s += ': ';
      }
      s += this.name;
      if (s.endsWith(',')) {
        s = s.substring(0, s.length - 1);
      }
      s = s.trim();
    }
    return s;
  }

  fullDetail(): string {
    let s = this.placeAndName();
    if (this.date) {
      if (s) {
        s += ', ';
      }
      s += this.date;
    }
    return s;
  }

  empty() {
    return !(this.name || this.date || this.place);
  }
}

export class InCollections {
  public uuid: string = '';
  public name: string = '';
}

import { getLocalizedField, getAllLanguageVersions, getLocalizedTitle } from '../utils/language-utils';

export function fromSolrToMetadata(doc: any, currentLang: string = 'cs'): Metadata {
  const metadata = new Metadata();

  metadata.uuid = doc.pid;
  metadata.model = doc.model;
  metadata.isPublic = doc.accessibility === 'public';

  metadata.licences = doc['licenses.facet'] ?? [];
  metadata.licence = selectPrimaryLicense(metadata.licences) ?? '';

  metadata.languages = doc['languages.facet'] ?? [];

  metadata.mainTitle = doc['root.title'] ?? '';

  metadata.volume = new Volume(
    doc['own_parent.pid'] ?? '',
    doc['date_range_start.year']?.toString() ?? '',
    doc['part.number.str'] ?? ''
  );

  metadata.inCollections = (doc.in_collections ?? []).map((uuid: string) => {
    const c = new InCollections();
    c.uuid = uuid;
    return c;
  });

  metadata.dateStr = doc['date.str'] ?? '';
  metadata.dateMin = doc['date.min'] ?? '';
  metadata.dateMax = doc['date.max'] ?? '';

  metadata.dateRangeStartYear = doc['date_range_start.year'];
  metadata.dateRangeStartMonth = doc['date_range_start.month'];
  metadata.dateRangeStartDay = doc['date_range_start.day'];

  metadata.dateRangeEndYear = doc['date_range_end.year'];
  metadata.dateRangeEndMonth = doc['date_range_end.month'];
  metadata.dateRangeEndDay = doc['date_range_end.day'];

  metadata.hasTiles = doc.has_tiles ?? false;
  metadata.level = doc.level;

  metadata.created = doc.created ?? '';
  metadata.modified = doc.modified ?? '';

  metadata.rootModel = doc['root.model'] ?? '';
  metadata.rootPid = doc['root.pid'] ?? '';
  metadata.ownParentPid = doc['own_parent.pid'] ?? '';
  metadata.ownParentModel = doc['own_parent.model'] ?? '';

  metadata.pidPaths = doc.pid_paths ?? [];
  metadata.ownPidPath = doc.own_pid_path ?? '';

  metadata.partNumberSort = doc['part.number.sort'];

  metadata.extent = doc.count_page ? `${doc.count_page} stran` : '';

  metadata.titles = (doc['titles.search'] ?? []).map((title: string) => {
    const info = new TitleInfo();
    info.title = title;
    return info;
  });

  metadata.authors = (doc['authors'] ?? []).map((authorStr: string) => {
    const author = new Author();
    author.name = authorStr;
    return author;
  });

  metadata.publishers = (doc['publishers.search'] ?? []).map((name: string) => {
    const pub = new Publisher();
    pub.name = name;
    return pub;
  });

  metadata.locations = (doc['shelf_locators'] ?? []).map((loc: string) => {
    const location = new Location();
    location.shelfLocator = loc;
    return location;
  });

  metadata.identifiers = {
    idOther: doc['id_other'] ?? [],
    idSysno: doc['id_sysno'] ?? [],
    idUuid: doc['id_uuid'] ?? [],
  };

  metadata.originUrl = doc['indexed'] ?? '';
  metadata.created = doc['created'] ?? '';
  metadata.modified = doc['modified'] ?? '';

  metadata.level = doc['level'];
  metadata.ownParentModel = doc['own_model_path'] ?? '';
  metadata.languages = doc['languages.facet'] ?? [];

  metadata.licence = selectPrimaryLicense(doc['licenses.facet'] ?? []) ?? '';
  metadata.dateStr = doc['date.str'] ?? '';
  metadata.dateMin = doc['date.min'] ?? '';
  metadata.dateMax = doc['date.max'] ?? '';

  metadata.pdf = doc['ds.img_full.mime'] === 'application/pdf';
  metadata.epub = doc['ds.img_full.mime'] === 'application/epub+zip';

  // Handle collection-specific fields
  if (doc.model === 'collection') {
    metadata.collectionDescription = getLocalizedField(doc, 'collection.desc', currentLang);
    metadata.collectionDescriptions = getAllLanguageVersions(doc, 'collection.desc');
    metadata.collectionTitles = getAllLanguageVersions(doc, 'title.search');
    metadata.collectionIsStandalone = doc['collection.is_standalone'] ?? false;

    // Use localized title for collections
    const localizedTitle = getLocalizedTitle(doc, currentLang);
    if (localizedTitle) {
      metadata.mainTitle = localizedTitle;
    }
  }

  metadata.monographUnitCount = doc['count_monograph_unit'];

  metadata.donators = doc['donator'] ?? [];

  return metadata;
}

/**
 * Merges MODS metadata into Solr metadata, filling in missing fields
 * @param solrMetadata Base metadata from Solr
 * @param modsMetadata Additional metadata from MODS
 * @returns Merged metadata object
 */
export function mergeMetadata(solrMetadata: Metadata, modsMetadata: Metadata): Metadata {
  const merged = { ...solrMetadata };

  // Merge simple string fields - use MODS if Solr field is empty
  if (!merged.mainTitle && modsMetadata.mainTitle) {
    merged.mainTitle = modsMetadata.mainTitle;
  }
  if (!merged.extent && modsMetadata.extent) {
    merged.extent = modsMetadata.extent;
  }

  // Merge array fields - add unique items from MODS that aren't in Solr
  // Titles
  if (modsMetadata.titles && modsMetadata.titles.length > 0) {
    merged.titles = [...merged.titles];
    const existingTitles = new Set(merged.titles.map(t => t.title));
    for (const title of modsMetadata.titles) {
      if (title.title && !existingTitles.has(title.title)) {
        merged.titles.push(title);
      }
    }
  }

  // Authors
  if (modsMetadata.authors && modsMetadata.authors.length > 0) {
    merged.authors = [...merged.authors];
    const existingAuthorsByName = new Map(merged.authors.map(a => [a.name, a]));
    for (const modsAuthor of modsMetadata.authors) {
      if (!modsAuthor.name) continue;
      const existing = existingAuthorsByName.get(modsAuthor.name);
      if (existing) {
        // Enrich existing Solr author with richer MODS data
        if (modsAuthor.identifiers?.length) existing.identifiers = modsAuthor.identifiers;
        if (modsAuthor.roles?.length) existing.roles = modsAuthor.roles;
        if (modsAuthor.date) existing.date = modsAuthor.date;
        if (modsAuthor.nameForFilter) existing.nameForFilter = modsAuthor.nameForFilter;
      } else {
        merged.authors.push(modsAuthor);
        existingAuthorsByName.set(modsAuthor.name, modsAuthor);
      }
    }
  }

  // Publishers
  if (modsMetadata.publishers && modsMetadata.publishers.length > 0) {
    merged.publishers = [...merged.publishers];
    const existingPublishers = new Set(merged.publishers.map(p => `${p.name}|${p.place}|${p.date}`));
    for (const publisher of modsMetadata.publishers) {
      const key = `${publisher.name}|${publisher.place}|${publisher.date}`;
      if (!existingPublishers.has(key)) {
        merged.publishers.push(publisher);
      }
    }
  }

  // Languages
  if (modsMetadata.languages && modsMetadata.languages.length > 0) {
    merged.languages = [...merged.languages];
    const existingLanguages = new Set(merged.languages);
    for (const lang of modsMetadata.languages) {
      if (!existingLanguages.has(lang)) {
        merged.languages.push(lang);
      }
    }
  }

  // Keywords
  if (modsMetadata.keywords && modsMetadata.keywords.length > 0) {
    merged.keywords = [...merged.keywords];
    const existingKeywords = new Set(merged.keywords);
    for (const keyword of modsMetadata.keywords) {
      if (!existingKeywords.has(keyword)) {
        merged.keywords.push(keyword);
      }
    }
  }

  // Geonames
  if (modsMetadata.geonames && modsMetadata.geonames.length > 0) {
    merged.geonames = [...merged.geonames];
    const existingGeonames = new Set(merged.geonames);
    for (const geoname of modsMetadata.geonames) {
      if (!existingGeonames.has(geoname)) {
        merged.geonames.push(geoname);
      }
    }
  }

  // Genres
  if (modsMetadata.genres && modsMetadata.genres.length > 0) {
    merged.genres = [...merged.genres];
    const existingGenres = new Set(merged.genres);
    for (const genre of modsMetadata.genres) {
      if (!existingGenres.has(genre)) {
        merged.genres.push(genre);
      }
    }
  }

  console.log('modsMetadata notes::', modsMetadata)

  // Notes
  if (modsMetadata.notes && modsMetadata.notes.length > 0) {
    const existingNotes = new Set(merged.notes);
    const newNotes = new Set(modsMetadata.notes);
    merged.notes = [];
    for (const note of newNotes) {
      merged.notes.push(note);
    }
  }

  // Abstracts
  if (modsMetadata.abstracts && modsMetadata.abstracts.length > 0) {
    merged.abstracts = [...merged.abstracts];
    const existingAbstracts = new Set(merged.abstracts);
    for (const abstract of modsMetadata.abstracts) {
      if (!existingAbstracts.has(abstract)) {
        merged.abstracts.push(abstract);
      }
    }
  }

  // Contents (table of contents)
  if (modsMetadata.contents && modsMetadata.contents.length > 0) {
    merged.contents = [...merged.contents];
    const existingContents = new Set(merged.contents);
    for (const content of modsMetadata.contents) {
      if (!existingContents.has(content)) {
        merged.contents.push(content);
      }
    }
  }

  // Locations
  if (modsMetadata.locations && modsMetadata.locations.length > 0) {
    merged.locations = [...merged.locations];

    // Create a map of existing locations by shelfLocator for easier lookup/updating
    // We assume identifier is shelfLocator
    const existingLocationMap = new Map<string, Location>();
    merged.locations.forEach(l => {
      if (l.shelfLocator) {
        existingLocationMap.set(l.shelfLocator, l);
      }
    });

    for (const modsLoc of modsMetadata.locations) {
      if (modsLoc.shelfLocator && existingLocationMap.has(modsLoc.shelfLocator)) {
        // Update existing location if MODS has physicalLocation and existing doesn't
        // Access via map is reference to object in array/map
        const existing = existingLocationMap.get(modsLoc.shelfLocator)!;

        if (modsLoc.physicalLocation && !existing.physicalLocation) {
          // Object is frozen from store, need to replace with a mutable copy
          // Find index in the NEW array copy
          const index = merged.locations.indexOf(existing);
          if (index > -1) {
            const newLoc = new Location();
            Object.assign(newLoc, existing);
            newLoc.physicalLocation = modsLoc.physicalLocation;
            merged.locations[index] = newLoc;

            // Update map reference just in case (though not strictly needed for this loop structure)
            existingLocationMap.set(modsLoc.shelfLocator, newLoc);
          }
        }
      } else {
        // Check if we should add it (avoid exact duplicates if shelfLocator is missing/same)
        // Fallback to full key check if no shelfLocator, or if shelfLocator is new
        const key = `${modsLoc.physicalLocation}|${modsLoc.shelfLocator}`;
        const isDuplicate = merged.locations.some(l => `${l.physicalLocation}|${l.shelfLocator}` === key);

        if (!isDuplicate) {
          merged.locations.push(modsLoc);
        }
      }
    }
  }

  // Physical descriptions
  if (modsMetadata.physicalDescriptions && modsMetadata.physicalDescriptions.length > 0) {
    merged.physicalDescriptions = [...merged.physicalDescriptions];
    const existingDescriptions = new Set(merged.physicalDescriptions.map(pd => `${pd.note}|${pd.extent}`));
    for (const description of modsMetadata.physicalDescriptions) {
      const key = `${description.note}|${description.extent}`;
      if (!existingDescriptions.has(key)) {
        merged.physicalDescriptions.push(description);
      }
    }
  }

  // Cartographic data
  if (modsMetadata.cartographicData && modsMetadata.cartographicData.length > 0) {
    merged.cartographicData = [...merged.cartographicData];
    const existingCartographic = new Set(merged.cartographicData.map(cd => `${cd.scale}|${cd.coordinates}`));
    for (const cartographic of modsMetadata.cartographicData) {
      const key = `${cartographic.scale}|${cartographic.coordinates}`;
      if (!existingCartographic.has(key)) {
        merged.cartographicData.push(cartographic);
      }
    }
  }

  // Identifiers - merge object keys
  if (modsMetadata.identifiers) {
    merged.identifiers = { ...merged.identifiers };
    for (const [key, values] of Object.entries(modsMetadata.identifiers)) {
      if (!Array.isArray(values)) continue; // Skip non-array values

      if (!merged.identifiers[key]) {
        merged.identifiers[key] = values;
      } else {
        // Add unique values
        merged.identifiers[key] = [...merged.identifiers[key]];
        const existingValues = new Set(merged.identifiers[key]);
        for (const value of values) {
          if (!existingValues.has(value)) {
            merged.identifiers[key].push(value);
          }
        }
      }
    }
  }

  // Donators
  if (modsMetadata.donators && modsMetadata.donators.length > 0) {
    merged.donators = [...merged.donators];
    const existingDonators = new Set(merged.donators);
    for (const donator of modsMetadata.donators) {
      if (!existingDonators.has(donator)) {
        merged.donators.push(donator);
      }
    }
  }

  // Subject Names Personal
  if (modsMetadata.subjectNamesPersonal && modsMetadata.subjectNamesPersonal.length > 0) {
    merged.subjectNamesPersonal = [...merged.subjectNamesPersonal];
    const existingPersonal = new Set(merged.subjectNamesPersonal.map(a => a.name));
    for (const author of modsMetadata.subjectNamesPersonal) {
      if (author.name && !existingPersonal.has(author.name)) {
        merged.subjectNamesPersonal.push(author);
      }
    }
  }

  // Subject Names Corporate
  if (modsMetadata.subjectNamesCorporate && modsMetadata.subjectNamesCorporate.length > 0) {
    merged.subjectNamesCorporate = [...merged.subjectNamesCorporate];
    const existingCorporate = new Set(merged.subjectNamesCorporate.map(a => a.name));
    for (const author of modsMetadata.subjectNamesCorporate) {
      if (author.name && !existingCorporate.has(author.name)) {
        merged.subjectNamesCorporate.push(author);
      }
    }
  }

  // Subject Temporals
  if (modsMetadata.subjectTemporals && modsMetadata.subjectTemporals.length > 0) {
    merged.subjectTemporals = [...merged.subjectTemporals];
    const existingTemporals = new Set(merged.subjectTemporals);
    for (const temporal of modsMetadata.subjectTemporals) {
      if (!existingTemporals.has(temporal)) {
        merged.subjectTemporals.push(temporal);
      }
    }
  }

  return merged;
}

