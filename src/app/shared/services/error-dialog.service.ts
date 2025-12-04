import { inject, Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ServerErrorDialogComponent } from '../dialogs/server-error-dialog/server-error-dialog.component';

@Injectable({
  providedIn: 'root'
})
export class ErrorDialogService {
  private dialog = inject(MatDialog);

  public openServerErrorDialog(): void {
    this.dialog.open(ServerErrorDialogComponent, {
      maxWidth: '90vw',
      disableClose: false,
      panelClass: 'server-error-dialog-panel'
    });
  }
}
