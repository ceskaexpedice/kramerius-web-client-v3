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
}
