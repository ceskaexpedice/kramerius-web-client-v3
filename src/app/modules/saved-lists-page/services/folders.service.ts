import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { Folder, CreateFolderRequest, UpdateFolderRequest, FolderItemsRequest, FolderDetails } from '../state/folders.models';
import { EnvironmentService } from '../../../shared/services/environment.service';
import { SolrSortFields, SolrSortDirections } from '../../../core/solr/solr-helpers';

@Injectable({
  providedIn: 'root'
})
export class FoldersService {

  constructor(
    private http: HttpClient,
    private environmentService: EnvironmentService,
    private translateService: TranslateService
  ) {
  }

  private get API_URL(): string {
    const url = this.environmentService.getApiUrl('folders');
    if (!url) {
      console.warn('FoldersService: API URL not available. Environment may not be loaded yet.');
      return '';
    }
    return url;
  }

  getFolders(): Observable<Folder[]> {
    return this.http.get<Folder[]>(`${this.API_URL}`);
  }

  createFolder(folder: CreateFolderRequest): Observable<Folder> {
    return this.http.post<Folder>(`${this.API_URL}`, folder);
  }

  updateFolder(uuid: string, folder: UpdateFolderRequest): Observable<Folder> {
    return this.http.put<Folder>(`${this.API_URL}/${uuid}`, folder);
  }

  deleteFolder(uuid: string): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/${uuid}`);
  }

  updateFolderItems(request: FolderItemsRequest): Observable<void> {
    return this.http.put<void>(`${this.API_URL}/${request.uuid}/items`, { items: request.items });
  }

  removeItemFromFolder(request: FolderItemsRequest): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/${request.uuid}/items`, {
      body: { items: request.items }
    });
  }

  getFolderDetails(uuid: string): Observable<FolderDetails> {
    return this.http.get<FolderDetails>(`${this.API_URL}/${uuid}`);
  }

  searchFolderItems(
    itemIds: string[],
    searchQuery?: string,
    sortBy?: SolrSortFields,
    sortDirection?: SolrSortDirections
  ): Observable<any> {
    const searchUrl = this.environmentService.getApiUrl('search') || '';
    const pidQuery = itemIds.map(id => `pid:"${id}"`).join(' OR ');

    let finalQuery = pidQuery;
    if (searchQuery && searchQuery.trim()) {
      finalQuery = `(${pidQuery}) AND title.search:"${searchQuery.trim()}"`;
    }

    const params: any = {
      q: finalQuery,
      rows: '1000'
    };

    if (sortBy && sortDirection) {
      params.sort = `${sortBy} ${sortDirection}`;
    }

    return this.http.get<any>(searchUrl, { params });
  }

  /**
   * Gets the translated name for the favorites folder
   */
  getFavoritesFolderName(): string {
    return this.translateService.instant('my-favorite--list');
  }

  /**
   * Sorts folders to put the favorites folder first, then rest in original order
   */
  sortFoldersWithFavoritesFirst(folders: Folder[]): Folder[] {
    if (!folders || folders.length === 0) {
      return folders;
    }

    const favoritesFolderName = this.getFavoritesFolderName();
    const favoritesFolder = folders.find(folder =>
      folder.name.toLowerCase() === favoritesFolderName.toLowerCase()
    );

    if (!favoritesFolder) {
      return folders;
    }

    const otherFolders = folders.filter(folder =>
      folder.name.toLowerCase() !== favoritesFolderName.toLowerCase()
    );

    return [favoritesFolder, ...otherFolders];
  }
}
