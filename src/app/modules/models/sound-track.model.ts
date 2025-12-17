import {DocumentTypeEnum} from '../constants/document-type';

export enum TrackViewType {
  DEFAULT = 'default',
  FOLDER = 'folder'
}

export interface SoundTrackModel {
  accessibility: string;
  licenses_of_ancestors: string[];
  model: DocumentTypeEnum;
  pid: string;
  ['root.pid']: string;
  ['root.title']?: string;
  ['title.search']: string;
  ['track.length']: number;
  url: string;
  part: string;
  parentPid: string;
  authors?: string[];
  year?: number;
}

export const parseSoundTrack = (doc: any): SoundTrackModel => ({
  accessibility: doc.accessibility,
  licenses_of_ancestors: doc.licenses_of_ancestors || [],
  model: doc.model,
  pid: doc.pid,
  'root.pid': doc.root?.pid || doc['root.pid'],
  'root.title': doc.root?.title || doc['root.title'],
  'title.search': doc['title.search'],
  'track.length': doc['track.length'] || 0,
  url: doc.url || '',
  part: doc.part || '',
  parentPid: doc.parentPid || doc['own_parent.pid'] || '',
  authors: doc['authors.facet'] || doc.authors || [],
  year: doc['date_range_start.year'] ? parseInt(doc['date_range_start.year'], 10) : undefined
});
