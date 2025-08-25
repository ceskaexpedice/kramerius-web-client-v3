import { createAction, props } from '@ngrx/store';
import { Folder, CreateFolderRequest, UpdateFolderRequest, FolderItemsRequest, FolderDetails } from './folders.models';

export const loadFolders = createAction('[Folders] Load Folders');

export const loadFoldersSuccess = createAction(
  '[Folders] Load Folders Success',
  props<{ folders: Folder[] }>()
);

export const loadFoldersFailure = createAction(
  '[Folders] Load Folders Failure',
  props<{ error: string }>()
);

export const createFolder = createAction(
  '[Folders] Create Folder',
  props<{ folder: CreateFolderRequest }>()
);

export const createFolderSuccess = createAction(
  '[Folders] Create Folder Success',
  props<{ folder: Folder }>()
);

export const createFolderFailure = createAction(
  '[Folders] Create Folder Failure',
  props<{ error: string }>()
);

export const updateFolder = createAction(
  '[Folders] Update Folder',
  props<{ uuid: string; folder: UpdateFolderRequest }>()
);

export const updateFolderSuccess = createAction(
  '[Folders] Update Folder Success',
  props<{ folder: Folder }>()
);

export const updateFolderFailure = createAction(
  '[Folders] Update Folder Failure',
  props<{ error: string }>()
);

export const deleteFolder = createAction(
  '[Folders] Delete Folder',
  props<{ uuid: string }>()
);

export const deleteFolderSuccess = createAction(
  '[Folders] Delete Folder Success',
  props<{ uuid: string }>()
);

export const deleteFolderFailure = createAction(
  '[Folders] Delete Folder Failure',
  props<{ error: string }>()
);

export const updateFolderItems = createAction(
  '[Folders] Update Folder Items',
  props<{ request: FolderItemsRequest }>()
);

export const updateFolderItemsSuccess = createAction(
  '[Folders] Update Folder Items Success',
  props<{ uuid: string; itemsCount: number }>()
);

export const updateFolderItemsFailure = createAction(
  '[Folders] Update Folder Items Failure',
  props<{ error: string }>()
);

export const selectFolder = createAction(
  '[Folders] Select Folder',
  props<{ folder: Folder | null }>()
);

export const clearFoldersError = createAction('[Folders] Clear Error');

export const loadFolderDetails = createAction(
  '[Folders] Load Folder Details',
  props<{ uuid: string }>()
);

export const loadFolderDetailsSuccess = createAction(
  '[Folders] Load Folder Details Success',
  props<{ folderDetails: FolderDetails }>()
);

export const loadFolderDetailsFailure = createAction(
  '[Folders] Load Folder Details Failure',
  props<{ error: string }>()
);

export const loadFolderSearchResults = createAction(
  '[Folders] Load Folder Search Results',
  props<{ itemIds: string[] }>()
);

export const loadFolderSearchResultsSuccess = createAction(
  '[Folders] Load Folder Search Results Success',
  props<{ results: any[]; totalCount: number }>()
);

export const loadFolderSearchResultsFailure = createAction(
  '[Folders] Load Folder Search Results Failure',
  props<{ error: string }>()
);

export const loadFirstFolderOnInit = createAction('[Folders] Load First Folder On Init');