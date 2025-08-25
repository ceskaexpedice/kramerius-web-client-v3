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
    selectedFolder: state.selectedFolder?.uuid === folder.uuid ? folder : state.selectedFolder
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

  on(FoldersActions.updateFolderItemsSuccess, (state, { uuid, itemsCount }): FoldersState => ({
    ...state,
    folders: state.folders.map(f => f.uuid === uuid ? { ...f, itemsCount } : f),
    loading: false,
    error: null,
    selectedFolder: state.selectedFolder?.uuid === uuid 
      ? { ...state.selectedFolder, itemsCount } 
      : state.selectedFolder
  })),

  on(FoldersActions.updateFolderItemsFailure, (state, { error }): FoldersState => ({
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
  }))
);

export const foldersFeatureKey = 'folders';