import {inject, Injectable} from '@angular/core';
import {MatDialog} from '@angular/material/dialog';
import {RecordInfoDialogComponent} from '../dialogs/record-info-dialog/record-info-dialog.component';
import {Metadata} from '../models/metadata.model';
import {BreakpointService} from './breakpoint.service';

@Injectable({
  providedIn: 'root'
})
export class RecordInfoService {

  public metadata: Metadata = new Metadata();
  private dialog = inject(MatDialog);
  private breakpointService = inject(BreakpointService);

  public openRecordInfoDialog(uuid: string): void {
    const isMobileOrTablet = this.breakpointService.isMobile() || this.breakpointService.isTablet();
    this.dialog.open(RecordInfoDialogComponent, {
      width: isMobileOrTablet ? '100vw' : '80vw',
      height: isMobileOrTablet ? '100vh' : '80vh',
      maxWidth: isMobileOrTablet ? '100vw' : undefined,
      maxHeight: isMobileOrTablet ? '100vh' : undefined,
      panelClass: isMobileOrTablet ? 'mobile-fullscreen-dialog' : undefined,
      data: uuid,
    });
  }

}
