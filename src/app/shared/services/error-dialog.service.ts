import { inject, Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ServerErrorDialogComponent } from '../dialogs/server-error-dialog/server-error-dialog.component';

@Injectable({
  providedIn: 'root'
})
export class ErrorDialogService {
  private dialog = inject(MatDialog);

  public openServerErrorDialog(): void {
    // Check if a server error dialog is already open to prevent multiple dialogs
    const isDialogOpen = this.dialog.openDialogs.some(
      dialog => dialog.componentInstance instanceof ServerErrorDialogComponent
    );

    if (!isDialogOpen) {
      this.dialog.open(ServerErrorDialogComponent, {
        maxWidth: '90vw',
        disableClose: false,
        panelClass: 'server-error-dialog-panel'
      });
    }
  }
}
