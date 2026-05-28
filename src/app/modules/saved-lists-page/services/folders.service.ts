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

  private readonly FAVORITES_KEY = 'my-favorite--list';

  // Known favorites folder names across all supported languages (public/i18n/*.json).
  // The backend has no favorites flag, so the folder is identified by matching its
  // stored name against any language's translation — preventing duplicates when the
  // user switches language.
  private readonly FAVORITES_NAMES_BY_LANG: Record<string, string> = {
    en: 'My favorites',
    cs: 'Moje oblíbené',
    sk: 'Moje obľúbené',
    pl: 'Moje ulubione',
  };

  /**
   * Gets the translated name for the favorites folder in the current language
   */
  getFavoritesFolderName(): string {
    return this.translateService.instant(this.FAVORITES_KEY);
  }

  /**
   * Name to display for the favorites folder, always in the current UI language.
   */
  getFavoritesDisplayName(): string {
    return this.getFavoritesFolderName();
  }

  /**
   * All known favorites folder names across supported languages, lower-cased.
   * Includes the current language's live translation to stay correct even if
   * the static list drifts from i18n content.
   */
  getAllFavoritesFolderNames(): string[] {
    const names = new Set<string>(
      Object.values(this.FAVORITES_NAMES_BY_LANG).map(n => n.toLowerCase())
    );
    const current = this.getFavoritesFolderName();
    if (current) {
      names.add(current.toLowerCase());
    }
    return [...names];
  }

  /**
   * Whether a folder is THE favorites folder, regardless of the language it was
   * created in.
   */
  isFavoritesFolder(folder: { name: string }): boolean {
    if (!folder?.name) {
      return false;
    }
    return this.getAllFavoritesFolderNames().includes(folder.name.toLowerCase());
  }

  /**
   * Sorts folders to put the favorites folder first, then rest in original order
   */
  sortFoldersWithFavoritesFirst(folders: Folder[]): Folder[] {
    if (!folders || folders.length === 0) {
      return folders;
    }

    const favoritesFolder = folders.find(folder => this.isFavoritesFolder(folder));

    if (!favoritesFolder) {
      return folders;
    }

    const otherFolders = folders.filter(folder => !this.isFavoritesFolder(folder));

    return [favoritesFolder, ...otherFolders];
  }
}
