import {inject, Injectable} from '@angular/core';
import {MatDialog} from '@angular/material/dialog';
import {RecordInfoDialogComponent} from '../dialogs/record-info-dialog/record-info-dialog.component';
import {Metadata} from '../models/metadata.model';

@Injectable({
  providedIn: 'root'
})
export class RecordInfoService {

  public metadata: Metadata = new Metadata();
  private dialog = inject(MatDialog);

  public openRecordInfoDialog(uuid: string): void {
    this.dialog.open(RecordInfoDialogComponent, {
      width: '80vw',
      height: '80vh',
      data: uuid,
    });
  }

}
