import {inject, Injectable} from '@angular/core';
import {MatDialog} from '@angular/material/dialog';
import {Metadata} from '../models/metadata.model';
import {BreakpointService} from './breakpoint.service';

@Injectable({
  providedIn: 'root'
})
export class RecordInfoService {

  public metadata: Metadata = new Metadata();
  private dialog = inject(MatDialog);
  private breakpointService = inject(BreakpointService);

  public async openRecordInfoDialog(uuid: string): Promise<void> {
    // Loaded on demand: a static import closes the cycle
    // metadata-section → metadata-dialog → DetailViewService → RecordInfoService
    // → RecordInfoDialogComponent → metadata-section, which throws a TDZ
    // "Cannot access 'MetadataSection' before initialization" depending on
    // module evaluation order. It also keeps the dialog out of eager bundles.
    const { RecordInfoDialogComponent } = await import('../dialogs/record-info-dialog/record-info-dialog.component');
    const isMobileOrTablet = this.breakpointService.isMobile() || this.breakpointService.isTablet();
    this.dialog.open(RecordInfoDialogComponent, {
      width: isMobileOrTablet ? 'calc(100vw / var(--ui-zoom, 1))' : 'calc(80vw / var(--ui-zoom, 1))',
      height: isMobileOrTablet ? 'calc(100dvh / var(--ui-zoom, 1))' : 'calc(80vh / var(--ui-zoom, 1))',
      maxWidth: isMobileOrTablet ? 'calc(100vw / var(--ui-zoom, 1))' : undefined,
      maxHeight: isMobileOrTablet ? 'calc(100dvh / var(--ui-zoom, 1))' : undefined,
      panelClass: isMobileOrTablet ? 'mobile-fullscreen-dialog' : undefined,
      data: uuid,
    });
  }

}
