import { Page } from './page.model';
import { Article } from './article.model';
import { DocumentItem } from './document_item.model';
import { PeriodicalItem } from './periodicalItem.model';
import { InternalPart } from './internal_part.model';

export class Metadata {
  public context: any = {};
  public uuid: string = '';
  public titles: TitleInfo[] = [];
  public authors: Author[] = [];
  public publishers: Publisher[] = [];
  public extent: string = '';
  public keywords: string[] = [];
  public geonames: string[] = [];
  public notes: string[] = [];
  public languages: string[] = [];
  public locations: Location[] = [];
  public abstracts: string[] = [];
  public genres: string[] = [];
  public contents: string[] = [];
  public cartographicData: CartographicData[] = [];
  public physicalDescriptions: PhysicalDescription[] = [];
  public identifiers: any = {};

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
  public epub: boolean = false
}

export class TitleInfo {
  public lang: string = '';
  public nonSort: string = '';
  public title: string = '';
  public subTitle: string = '';
  public partName: string = '';
  public partNumber: string = '';
}

export class Volume {
  constructor(public uuid: string = '', public year: string = '', public number: string = '') {}
}

export class Author {
  public type: string = '';
  public usage: string = '';
  public name: string = '';
  public date: string = '';
  public roles: string[] = [];
  public primary: boolean = false;

  constructor() {
    this.roles = [];
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
  constructor(public note: string = '', public extent: string = '') {}

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

export function fromSolrToMetadata(doc: any): Metadata {
  const metadata = new Metadata();

  metadata.uuid = doc.pid;
  metadata.model = doc.model;
  metadata.isPublic = doc.accessibility === 'public';

  metadata.licences = doc.licenses ?? [];
  metadata.licence = doc['licenses.facet']?.[0] ?? '';

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
  metadata.licences = doc['licenses'] ?? [];
  metadata.licence = doc['licenses.facet']?.[0] ?? '';
  metadata.dateStr = doc['date.str'] ?? '';
  metadata.dateMin = doc['date.min'] ?? '';
  metadata.dateMax = doc['date.max'] ?? '';

  metadata.pdf = doc['ds.img_full.mime'] === 'application/pdf';
  metadata.epub = doc['ds.img_full.mime'] === 'application/epub+zip';

  return metadata;
}


