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
  public extent: String = '';
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

  public mainTitle: string = '';
  public donators: string[] = [];

  public activePages: string = '';
  public activePage: Page | null = null;
  public activePageRight: Page | null = null;

  public originUrl: string = '';

  public licence: string = '';

  public inCollections: InCollections[] = [];
  public inCollectionsDirect: InCollections[] = [];
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
