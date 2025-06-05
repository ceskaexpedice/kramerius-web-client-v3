export class DocumentItem {
  title: string = '';
  titleEn: string = '';
  localTitles: any = {};
  authors: string[] = [];
  geonames: string[] = [];
  date: string = '';
  doctype: string = '';
  category: string = '';
  uuid: string = '';
  root_uuid: string = '';
  root_title: string = '';
  public: boolean = false;
  url: string = '';
  description: string = '';
  descriptionEn: string = '';
  localDescriptions: any = {};
  volumeNumber: string = '';
  volumeYear: string = '';
  pdf: boolean = false;
  epub: boolean = false;
  hits: number = 0;
  context: Context[] = [];
  library: string = '';
  donators: string[] = [];
  params: any = {};
  north: number = 0;
  south: number = 0;
  west: number = 0;
  east: number = 0;
  licences: string[] = [];
  sources: string[] = [];
  originUrl: string = '';
  index: number = 0;
  thumbnail: string = '';

  selected: boolean = false;
  licence: string = '';
  in_collection: string[] = [];
  in_collections: string[] = [];

  createdAt: string = '';
}

export class Context {
  constructor(public uuid: string = '', public doctype: string = '') {}
}
