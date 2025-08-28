import {DocumentTypeEnum} from '../constants/document-type';

export interface SoundTrackModel {
  accessibility: string;
  licenses_of_ancestors: string[];
  model: DocumentTypeEnum;
  pid: string;
  ['title.search']: string;
  ['track.length']: number;
  url: string;
  part: string;
  parentPid: string;
}

export const parseSoundTrack = (doc: any): SoundTrackModel => ({
  accessibility: doc.accessibility,
  licenses_of_ancestors: doc.licenses_of_ancestors || [],
  model: doc.model,
  pid: doc.pid,
  'title.search': doc['title.search'],
  'track.length': doc['track.length'] || 0,
  url: doc.url || '',
  part: doc.part || '',
  parentPid: doc.parentPid || doc['own_parent.pid'] || ''
});
