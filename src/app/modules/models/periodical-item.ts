import {DocumentAccessibilityEnum} from '../constants/document-accessibility';

export interface PeriodicalItem {
  uuid: string;
  title: string;
  dateRange: string;
  accessibility: DocumentAccessibilityEnum;
  licenses: string[];
  publishers?: string[];
  publicationPlaces?: string[];
  languages?: string[];
  keywords?: string[];
  geographicNames?: string[];
  genres?: string[];
  shelfLocators?: string[];
  created?: string;
  modified?: string;
  hasTiles?: boolean;

  model?: string;
  'root.pid'?: string;
  'root.title'?: string;
  'date.str'?: string;
  children?: PeriodicalItemChild[];
}

export interface PeriodicalItemChild {
  'date.str': string;
  pid: string;
}

export interface PeriodicalItemYear {
  year: string;
  exists: boolean;
  pid: string;
  accessibility: DocumentAccessibilityEnum;
}
