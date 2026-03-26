import {DocumentAccessibilityEnum} from '../constants/document-accessibility';
import {Metadata} from '../../shared/models/metadata.model';

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

  model: string;
  'root.pid': string;
  'root.title'?: string;
  'date.str'?: string;
  ownParentPid?: string;
  children?: PeriodicalItemChild[];
}

export interface PeriodicalItemChild {
  'date.str': string;
  'part.number.str': string;
  'date_range_end.day'?: string;
  'date_range_end.month'?: string;
  'date_range_end.year'?: string;
  pid: string;
  model: string;
  licenses: string[];
  'licenses.facet'?: string[];
  ownParentPid?: string;
}

export interface PeriodicalItemYear {
  year: string;
  exists: boolean;
  pid: string;
  model: string;
  accessibility: DocumentAccessibilityEnum;
  licenses: string[];
  'licenses.facet'?: string[];
}

/** Returns true when at least one child has day+month data suitable for calendar display */
export function hasCalendarDisplayableChildren(children: PeriodicalItemChild[]): boolean {
  return children?.length > 0 && children.some(
    child => !!child['date_range_end.day'] && !!child['date_range_end.month']
  );
}

export function parsePeriodicalItemFromMetadata(metadata: Metadata): PeriodicalItem {
  return {
    uuid: metadata.uuid,
    title: metadata.mainTitle,
    dateRange: buildDateRange(metadata),
    accessibility: metadata.isPublic ? DocumentAccessibilityEnum.PUBLIC : DocumentAccessibilityEnum.PRIVATE,
    licenses: metadata.licences,
    publishers: metadata.publishers?.map(p => p.fullDetail()) ?? [],
    publicationPlaces: metadata.publishers?.map(p => p.place).filter(Boolean) ?? [],
    languages: metadata.languages ?? [],
    keywords: metadata.keywords ?? [],
    geographicNames: metadata.geonames ?? [],
    genres: metadata.genres ?? [],
    shelfLocators: metadata.locations?.map(l => l.shelfLocator).filter(Boolean) ?? [],
    created: metadata.created,
    modified: metadata.modified,
    hasTiles: metadata.hasTiles,

    model: metadata.model,
    'root.pid': metadata.rootPid,
    'root.title': metadata.mainTitle,
    'date.str': metadata.dateStr,
    ownParentPid: metadata.ownParentPid,

    children: [],
  };
}

function buildDateRange(metadata: Metadata): string {
  const start = metadata.dateRangeStartYear;
  const end = metadata.dateRangeEndYear;

  if (start && end) {
    return `${start}–${end}`;
  } else if (start) {
    return `${start}`;
  } else if (metadata.dateStr) {
    return metadata.dateStr;
  }

  return '';
}
