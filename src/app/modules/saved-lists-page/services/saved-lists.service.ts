import { Injectable, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { DeleteItemDialogComponent } from '../../../shared/dialogs/delete-item-dialog/delete-item-dialog.component';
import { SoundTrackModel } from '../../models/sound-track.model';
import * as FoldersActions from '../state/folders.actions';

@Injectable({
  providedIn: 'root'
})
export class SavedListsService {
  private dialog = inject(MatDialog);
  private store = inject(Store);

  /**
   * Shows confirmation dialog for deleting a saved list/folder
   */
  confirmDeleteList(folderName: string): Observable<string> {
    const dialogRef = this.dialog.open(DeleteItemDialogComponent, {
      data: {
        title: 'delete-list-title',
        titleParams: { name: folderName },
        message: 'delete-list-message',
        messageParams: { name: folderName }
      }
    });

    return dialogRef.afterClosed();
  }

  /**
   * Shows confirmation dialog for removing item from favorites
   */
  confirmRemoveFromFavorites(itemName?: string): Observable<string> {
    const dialogData: any = {
      title: 'remove-from-favorites-title',
      message: 'remove-from-favorites-message'
    };

    if (itemName) {
      dialogData.titleParams = { name: itemName };
      dialogData.messageParams = { name: itemName };
    }

    const dialogRef = this.dialog.open(DeleteItemDialogComponent, {
      data: dialogData
    });

    return dialogRef.afterClosed();
  }

  /**
   * Shows confirmation dialog for removing a track from saved list
   */
  confirmRemoveTrack(track: SoundTrackModel): Observable<string> {
    const dialogRef = this.dialog.open(DeleteItemDialogComponent, {
      data: {
        title: 'remove-track-title',
        titleParams: { name: track['title.search'] },
        message: 'remove-track-message',
        messageParams: { name: track['title.search'] }
      }
    });

    return dialogRef.afterClosed();
  }

  /**
   * Deletes a folder with confirmation
   */
  deleteFolder(folderUuid: string, folderName: string): void {
    this.confirmDeleteList(folderName).subscribe(result => {
      if (result === 'delete') {
        this.store.dispatch(FoldersActions.deleteFolder({ uuid: folderUuid }));
      }
    });
  }

  /**
   * Removes item from folder with confirmation
   */
  removeItemFromFolder(folderUuid: string, itemId: string, itemName?: string, onSuccess?: () => void): void {
    this.confirmRemoveFromFavorites(itemName).subscribe(result => {
      if (result === 'delete') {
        this.store.dispatch(FoldersActions.removeItemFromFolder({
          request: {
            uuid: folderUuid,
            items: [itemId]
          }
        }));

        // Reload folder details to refresh the current view
        this.store.dispatch(FoldersActions.loadFolderDetails({ uuid: folderUuid }));

        onSuccess?.();
      }
    });
  }

  /**
   * Removes track from folder with confirmation
   */
  removeTrackFromFolder(folderUuid: string, track: SoundTrackModel): void {
    this.confirmRemoveTrack(track).subscribe(result => {
      if (result === 'delete') {
        this.store.dispatch(FoldersActions.removeItemFromFolder({
          request: {
            uuid: folderUuid,
            items: [track.pid]
          }
        }));
      }
    });
  }
}