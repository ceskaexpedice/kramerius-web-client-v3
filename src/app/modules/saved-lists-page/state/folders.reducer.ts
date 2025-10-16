import { createReducer, on } from '@ngrx/store';
import { FoldersState, initialFoldersState } from './folders.models';
import * as FoldersActions from './folders.actions';

export const foldersReducer = createReducer(
  initialFoldersState,

  on(FoldersActions.loadFolders, (state): FoldersState => ({
    ...state,
    loading: true,
    error: null
  })),

  on(FoldersActions.loadFoldersSuccess, (state, { folders }): FoldersState => ({
    ...state,
    folders,
    loading: false,
    error: null
  })),

  on(FoldersActions.loadFoldersFailure, (state, { error }): FoldersState => ({
    ...state,
    loading: false,
    error
  })),

  on(FoldersActions.createFolder, (state): FoldersState => ({
    ...state,
    loading: true,
    error: null
  })),

  on(FoldersActions.createFolderSuccess, (state, { folder }): FoldersState => ({
    ...state,
    folders: [...state.folders, folder],
    loading: false,
    error: null
  })),

  on(FoldersActions.createFolderFailure, (state, { error }): FoldersState => ({
    ...state,
    loading: false,
    error
  })),

  on(FoldersActions.updateFolder, (state): FoldersState => ({
    ...state,
    loading: true,
    error: null
  })),

  on(FoldersActions.updateFolderSuccess, (state, { folder }): FoldersState => ({
    ...state,
    folders: state.folders.map(f => f.uuid === folder.uuid ? folder : f),
    loading: false,
    error: null,
    selectedFolder: state.selectedFolder?.uuid === folder.uuid ? folder : state.selectedFolder,
    folderDetails: state.folderDetails?.uuid === folder.uuid 
      ? { ...state.folderDetails, name: folder.name, updatedAt: folder.updatedAt } 
      : state.folderDetails
  })),

  on(FoldersActions.updateFolderFailure, (state, { error }): FoldersState => ({
    ...state,
    loading: false,
    error
  })),

  on(FoldersActions.deleteFolder, (state): FoldersState => ({
    ...state,
    loading: true,
    error: null
  })),

  on(FoldersActions.deleteFolderSuccess, (state, { uuid }): FoldersState => ({
    ...state,
    folders: state.folders.filter(f => f.uuid !== uuid),
    loading: false,
    error: null,
    selectedFolder: state.selectedFolder?.uuid === uuid ? null : state.selectedFolder
  })),

  on(FoldersActions.deleteFolderFailure, (state, { error }): FoldersState => ({
    ...state,
    loading: false,
    error
  })),

  on(FoldersActions.updateFolderItems, (state): FoldersState => ({
    ...state,
    loading: true,
    error: null
  })),

  on(FoldersActions.updateFolderItemsSuccess, (state, { uuid, itemsCount, items }): FoldersState => {
    const updatedFolders = state.folders.map(f =>
      f.uuid === uuid ? { ...f, itemsCount: f.itemsCount + itemsCount } : f
    );

    // Optimistically update the folder items mapping
    const updatedMapping = new Map(state.folderItemsMapping);
    const existingItems = updatedMapping.get(uuid) || new Set<string>();
    const newItems = new Set([...existingItems, ...items]);
    updatedMapping.set(uuid, newItems);

    return {
      ...state,
      folders: updatedFolders,
      folderItemsMapping: updatedMapping,
      loading: false,
      error: null,
      selectedFolder: state.selectedFolder?.uuid === uuid
        ? { ...state.selectedFolder, itemsCount: state.selectedFolder.itemsCount + itemsCount }
        : state.selectedFolder
    };
  }),

  on(FoldersActions.updateFolderItemsFailure, (state, { error }): FoldersState => ({
    ...state,
    loading: false,
    error
  })),

  on(FoldersActions.removeItemFromFolder, (state): FoldersState => ({
    ...state,
    loading: true,
    error: null
  })),

  on(FoldersActions.removeItemFromFolderSuccess, (state, { uuid, itemsCount, items }): FoldersState => {
    const updatedFolders = state.folders.map(f =>
      f.uuid === uuid ? { ...f, itemsCount: Math.max(0, f.itemsCount - itemsCount) } : f
    );

    // Optimistically update the folder items mapping
    const updatedMapping = new Map(state.folderItemsMapping);
    const existingItems = updatedMapping.get(uuid) || new Set<string>();
    const newItems = new Set(existingItems);
    items.forEach(item => newItems.delete(item));
    updatedMapping.set(uuid, newItems);

    return {
      ...state,
      folders: updatedFolders,
      folderItemsMapping: updatedMapping,
      loading: false,
      error: null,
      selectedFolder: state.selectedFolder?.uuid === uuid
        ? { ...state.selectedFolder, itemsCount: Math.max(0, state.selectedFolder.itemsCount - itemsCount) }
        : state.selectedFolder,
      folderDetails: state.folderDetails?.uuid === uuid
        ? { ...state.folderDetails, itemsCount: Math.max(0, state.folderDetails.itemsCount - itemsCount) }
        : state.folderDetails
    };
  }),

  on(FoldersActions.removeItemFromFolderFailure, (state, { error }): FoldersState => ({
    ...state,
    loading: false,
    error
  })),

  on(FoldersActions.selectFolder, (state, { folder }): FoldersState => ({
    ...state,
    selectedFolder: folder
  })),

  on(FoldersActions.clearFoldersError, (state): FoldersState => ({
    ...state,
    error: null
  })),

  on(FoldersActions.loadFolderDetails, (state): FoldersState => ({
    ...state,
    folderDetailsLoading: true,
    error: null
  })),

  on(FoldersActions.loadFolderDetailsSuccess, (state, { folderDetails }): FoldersState => ({
    ...state,
    folderDetails,
    folderDetailsLoading: false,
    error: null
  })),

  on(FoldersActions.loadFolderDetailsFailure, (state, { error }): FoldersState => ({
    ...state,
    folderDetailsLoading: false,
    error
  })),

  on(FoldersActions.loadFolderSearchResults, (state): FoldersState => ({
    ...state,
    folderSearchResultsLoading: true,
    error: null
  })),

  on(FoldersActions.loadFolderSearchResultsSuccess, (state, { results, totalCount }): FoldersState => ({
    ...state,
    folderSearchResults: results,
    folderSearchResultsTotalCount: totalCount,
    folderSearchResultsLoading: false,
    error: null
  })),

  on(FoldersActions.loadFolderSearchResultsFailure, (state, { error }): FoldersState => ({
    ...state,
    folderSearchResultsLoading: false,
    error
  })),

  on(FoldersActions.setSearchQuery, (state, { searchQuery }): FoldersState => ({
    ...state,
    searchQuery
  })),

  on(FoldersActions.setSortParams, (state, { sortBy, sortDirection }): FoldersState => ({
    ...state,
    sortBy,
    sortDirection
  })),

  on(FoldersActions.searchFolders, (state, { searchQuery, sortBy, sortDirection }): FoldersState => ({
    ...state,
    searchQuery,
    sortBy: sortBy || state.sortBy,
    sortDirection: sortDirection || state.sortDirection,
    folderSearchResultsLoading: true,
    error: null
  })),

  // New reducers for folder items mapping
  on(FoldersActions.loadAllFolderItems, (state): FoldersState => ({
    ...state,
    folderItemsMappingLoading: true,
    error: null
  })),

  on(FoldersActions.loadAllFolderItemsSuccess, (state, { folderItemsMapping }): FoldersState => ({
    ...state,
    folderItemsMapping,
    folderItemsMappingLoading: false,
    error: null
  })),

  on(FoldersActions.loadAllFolderItemsFailure, (state, { error }): FoldersState => ({
    ...state,
    folderItemsMappingLoading: false,
    error
  }))
);

export const foldersFeatureKey = 'folders';