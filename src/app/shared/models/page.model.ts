import {DocumentTypeEnum} from '../../modules/constants/document-type';

export class Page {
  snippet: string = '';
  loaded: boolean = false;
  uuid: string = '';
  parentDoctype: string = '';
  parentUuid: string = '';
  type: string = '';
  number: string = '';
  index: number = 0;
  thumb: string = '';
  display: number = 0;
  selected: boolean = false;
  position: PagePosition = PagePosition.None;
  imageType: PageImageType = PageImageType.None;
  licences: any[] = [];
  licence: string = '';
  originUrl: string = '';
  public: boolean = false;
  title: string = '';
  placement: string = '';
  lockHash: string = '';

  pid: string = '';
  'date.str': string = '';
  'page.number': string = '';
  'page.type': string = '';
  model?: DocumentTypeEnum | string | null;
  licenses_of_ancestors: string[] = [];
}

export enum PagePosition {
  Single, None, Left, Right
}

export enum PageImageType {
  TILES, PDF, JPEG, None
}
