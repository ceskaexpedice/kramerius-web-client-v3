export interface BookItem {
  uuid: string;
  title: string;
  accessibility: string;
  licenses: string[];
  ccnbIds: string[];
  oclcIds: string[];
  created: string;
  modified: string;
  indexerVersion: number;
  hasTiles: boolean;
}
