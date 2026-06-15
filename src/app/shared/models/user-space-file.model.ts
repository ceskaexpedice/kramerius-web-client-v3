export type UserSpaceFileType = 'pdf' | 'epub' | 'text';

/** A bundle stored in the logged-in user's space, as returned by
 *  `GET userrequests/userspace`. */
export interface UserSpaceFile {
  token: string;
  pid: string;
  type: UserSpaceFileType;
  created: string;
  size: number;
  available: boolean;
}

export type DownloadHistoryStatus = 'available' | 'expired';

/** View-model row for the download history dialog: the raw file plus enriched
 *  display data (title/year/thumbnail) fetched per pid. */
export interface DownloadHistoryRow {
  file: UserSpaceFile;
  title?: string;
  year?: string;
  thumbnailUrl?: string;
  status: DownloadHistoryStatus;
  enriching: boolean;
}
