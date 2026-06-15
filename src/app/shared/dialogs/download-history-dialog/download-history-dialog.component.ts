import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { UpperCasePipe } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { DownloadHistoryService } from '../../services/download-history.service';
import { KrameriusApiService } from '../../services/kramerius-api.service';
import { EnvironmentService } from '../../services/environment.service';
import { ThumbnailImageComponent } from '../../components/thumbnail-image/thumbnail-image.component';
import { ToastService } from '../../services/toast.service';
import { DownloadHistoryRow, UserSpaceFile } from '../../models/user-space-file.model';

@Component({
  selector: 'app-download-history-dialog',
  standalone: true,
  imports: [TranslatePipe, UpperCasePipe, ThumbnailImageComponent],
  templateUrl: './download-history-dialog.component.html',
  styleUrls: ['./download-history-dialog.component.scss', '../generic-dialog.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DownloadHistoryDialogComponent implements OnInit {

  private dialogRef = inject(MatDialogRef<DownloadHistoryDialogComponent>, { optional: true });
  private service = inject(DownloadHistoryService);
  private api = inject(KrameriusApiService);
  private env = inject(EnvironmentService);
  private toast = inject(ToastService);

  readonly rows = signal<DownloadHistoryRow[]>([]);
  readonly loading = signal(true);
  readonly error = signal(false);

  ngOnInit(): void {
    this.service.listUserFiles(true).subscribe({
      next: (files) => {
        const rows = (files ?? []).map((file) => this.toRow(file));
        this.rows.set(rows);
        this.loading.set(false);
        rows.forEach((row) => this.enrichRow(row));
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      }
    });
  }

  private toRow(file: UserSpaceFile): DownloadHistoryRow {
    return {
      file: {
        ...file,
        available: false
      },
      status: 'expired',
      enriching: true,
      thumbnailUrl: `${this.env.getApiUrl('items')}/${file.pid}/image/thumb`
    };
    return {
      file,
      status: file.available ? 'available' : 'expired',
      enriching: true,
      thumbnailUrl: `${this.env.getApiUrl('items')}/${file.pid}/image/thumb`
    };
  }

  /** Fetch title + year for the row's pid; fall back to the pid on failure. */
  private enrichRow(row: DownloadHistoryRow): void {
    this.api.getSearchResults(`pid:"${row.file.pid}"`, true)
      .pipe(
        map((res) => res?.response?.docs?.[0] ?? null),
        catchError(() => of(null))
      )
      .subscribe((doc) => {
        const updated: DownloadHistoryRow = { ...row, enriching: false };
        if (doc) {
          updated.title = doc['root.title'] || doc['title.search'] || doc['titles.search']?.[0] || undefined;
          const year = doc['date_range_start.year'];
          updated.year = year != null ? String(year) : undefined;
        }
        this.rows.update((rows) =>
          rows.map((r) => (r.file.token === row.file.token ? updated : r))
        );
      });
  }

  /** Format an ISO date-time as the Czech `d. M. yyyy` (e.g. `20. 5. 2026`). */
  formatDate(iso: string): string {
    const date = new Date(iso);
    if (isNaN(date.getTime())) return iso;
    return `${date.getDate()}. ${date.getMonth() + 1}. ${date.getFullYear()}`;
  }

  download(row: DownloadHistoryRow): void {
    if (row.status !== 'available') return;
    this.service.download(row.file.token, this.buildFilename(row)).subscribe({
      error: () => {
        // The file was likely cleaned up server-side since the list was loaded.
        this.toast.show('download-history--download-error');
        // this.rows.update((rows) =>
        //   rows.map((r) =>
        //     r.file.token === row.file.token ? { ...r, status: 'expired' } : r
        //   )
        // );
      }
    });
  }

  private buildFilename(row: DownloadHistoryRow): string {
    const base = (row.title || row.file.pid).replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '');
    const ext = row.file.type === 'text' ? 'txt' : row.file.type;
    return `${base || row.file.pid}.${ext}`;
  }

  onClose(): void {
    this.dialogRef?.close();
  }
}
