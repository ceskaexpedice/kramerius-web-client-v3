import {SearchDocument} from '../../models/search-document';
import {SolrSortDirections, SolrSortFields} from '../../../core/solr/solr-helpers';
import {FacetItem} from '../../models/facet-item';

export interface FolderLastSearchPayload {
  itemIds: string[];
  query: string;
  filters: string[];
  sortBy: SolrSortFields;
  sortDirection: SolrSortDirections;
  grouped?: boolean;
}

export interface FolderUser {
  createdAt: string;
  userRole: 'owner' | 'follower';
  userId: string;
}

export interface Folder {
  name: string;
  uuid: string;
  itemsCount: number;
  users: FolderUser[][];
  updatedAt: string;
}

export interface FolderItem {
  createdAt: string;
  id: string;
}

export interface FolderDetails {
  name: string;
  uuid: string;
  items: FolderItem[][];
  itemsCount: number;
  users: FolderUser[][];
  updatedAt: string;
}

export interface CreateFolderRequest {
  name: string;
}

export interface UpdateFolderRequest {
  name: string;
}

export interface FolderItemsRequest {
  uuid: string;
  items: string[];
}

export interface FoldersState {
  folders: Folder[];
  loading: boolean;
  error: string | null;
  selectedFolder: Folder | null;
  folderDetails: FolderDetails | null;
  folderDetailsLoading: boolean;
  folderSearchResults: any[];
  folderSearchResultsLoading: boolean;
  folderSearchResultsTotalCount: number;
  folderPageSearchResults: any[];
  folderPageTotalCount: number;
  folderPageResultsLoading: boolean;
  lastFolderSearchPayload: FolderLastSearchPayload | null;
  folderFacets: Record<string, FacetItem[]>;
  searchQuery: string;
  sortBy: SolrSortFields;
  sortDirection: SolrSortDirections;
  // New properties for folder items mapping
  folderItemsMapping: Map<string, Set<string>>; // Map<folderId, Set<itemId>>
  folderItemsMappingLoading: boolean;
}

export const initialFoldersState: FoldersState = {
  folders: [],
  loading: false,
  error: null,
  selectedFolder: null,
  folderDetails: null,
  folderDetailsLoading: false,
  folderSearchResults: [],
  folderSearchResultsLoading: false,
  folderSearchResultsTotalCount: 0,
  folderPageSearchResults: [],
  folderPageTotalCount: 0,
  folderPageResultsLoading: false,
  lastFolderSearchPayload: null,
  folderFacets: {},
  searchQuery: '',
  sortBy: SolrSortFields.relevance,
  sortDirection: SolrSortDirections.desc,
  folderItemsMapping: new Map(),
  folderItemsMappingLoading: false
};
