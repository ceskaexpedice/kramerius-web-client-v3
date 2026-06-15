import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { Observable } from 'rxjs';
import { shareReplay, tap } from 'rxjs/operators';
import { EnvironmentService } from './environment.service';
import { SKIP_ERROR_INTERCEPTOR } from '../../core/services/http-context-tokens';
import { UserSpaceFile } from '../models/user-space-file.model';
import { DownloadHistoryDialogComponent } from '../dialogs/download-history-dialog/download-history-dialog.component';

@Injectable({
  providedIn: 'root'
})
export class DownloadHistoryService {

  private http = inject(HttpClient);
  private env = inject(EnvironmentService);
  private dialog = inject(MatDialog);

  private currentDialogRef: MatDialogRef<unknown> | null = null;

  /** List of bundles stored in the logged-in user's space. */
  listUserFiles(skipErrorHandling = false): Observable<UserSpaceFile[]> {
    const context = new HttpContext().set(SKIP_ERROR_INTERCEPTOR, skipErrorHandling);
    return this.http.get<UserSpaceFile[]>(`${this.env.getApiUrl('')}userrequests/userspace`, { context });
  }

  /** Direct URL that streams the stored file for a given token. */
  getDownloadUrl(token: string): string {
    return `${this.env.getApiUrl('')}userrequests/userspace/${token}`;
  }

  /**
   * Download the stored file. The endpoint is authenticated, so we fetch it via
   * HttpClient (the token interceptor attaches the bearer token) as a blob and
   * trigger a save — a plain `window.open` tab would have no auth header and
   * gets rejected with 404.
   */
  download(token: string, filename: string): Observable<Blob> {
    const context = new HttpContext().set(SKIP_ERROR_INTERCEPTOR, true);
    const request = this.http.get(this.getDownloadUrl(token), { responseType: 'blob', context }).pipe(
      tap((blob) => this.saveBlob(blob, filename)),
      shareReplay(1)
    );
    // Subscribe so the download fires; callers may also subscribe to react.
    request.subscribe({ error: () => {} });
    return request;
  }

  private saveBlob(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  openDialog(): void {
    if (this.currentDialogRef) {
      return;
    }

    this.currentDialogRef = this.dialog.open(DownloadHistoryDialogComponent, {
      width: '80vw',
      maxWidth: '1024px',
      panelClass: 'download-history-dialog-panel'
    });

    this.currentDialogRef.afterClosed().subscribe(() => {
      this.currentDialogRef = null;
    });
  }
}
