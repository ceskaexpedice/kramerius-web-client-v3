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

