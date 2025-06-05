import { Metadata } from './metadata.model';

export class PeriodicalItem {
  title: string = '';
  date: string = '';
  name: string = '';
  number: string = '';
  sortNumber: number = 0;
  sortIndex: number = 0;
  doctype: string = '';
  public: boolean = false;
  uuid: string = '';
  thumb: string = '';
  virtual: boolean = false;
  metadata: Metadata = new Metadata();
  editionType: string = '';
  licences: string[] = [];
  selected: boolean = false;
}

