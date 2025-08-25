import { createFeatureSelector, createSelector } from '@ngrx/store';
import { FoldersState } from './folders.models';
import { foldersFeatureKey } from './folders.reducer';

export const selectFoldersState = createFeatureSelector<FoldersState>(foldersFeatureKey);

export const selectAllFolders = createSelector(
  selectFoldersState,
  (state: FoldersState) => state.folders
);

export const selectFoldersLoading = createSelector(
  selectFoldersState,
  (state: FoldersState) => state.loading
);

export const selectFoldersError = createSelector(
  selectFoldersState,
  (state: FoldersState) => state.error
);

export const selectSelectedFolder = createSelector(
  selectFoldersState,
  (state: FoldersState) => state.selectedFolder
);

export const selectFolderByUuid = (uuid: string) => createSelector(
  selectAllFolders,
  (folders) => folders.find(folder => folder.uuid === uuid)
);

export const selectUserOwnedFolders = createSelector(
  selectAllFolders,
  (folders) => folders.filter(folder => 
    folder.users.some(userGroup => 
      userGroup.some(user => user.userRole === 'owner')
    )
  )
);

export const selectUserFollowedFolders = createSelector(
  selectAllFolders,
  (folders) => folders.filter(folder => 
    folder.users.some(userGroup => 
      userGroup.some(user => user.userRole === 'follower')
    )
  )
);

export const selectFoldersCount = createSelector(
  selectAllFolders,
  (folders) => folders.length
);

export const selectTotalItemsCount = createSelector(
  selectAllFolders,
  (folders) => folders.reduce((total, folder) => total + folder.itemsCount, 0)
);

export const selectFolderDetails = createSelector(
  selectFoldersState,
  (state: FoldersState) => state.folderDetails
);

export const selectFolderDetailsLoading = createSelector(
  selectFoldersState,
  (state: FoldersState) => state.folderDetailsLoading
);

export const selectFolderSearchResults = createSelector(
  selectFoldersState,
  (state: FoldersState) => state.folderSearchResults
);

export const selectFolderSearchResultsLoading = createSelector(
  selectFoldersState,
  (state: FoldersState) => state.folderSearchResultsLoading
);

export const selectFolderSearchResultsTotalCount = createSelector(
  selectFoldersState,
  (state: FoldersState) => state.folderSearchResultsTotalCount
);

export const selectActiveFolderItems = createSelector(
  selectFolderDetails,
  (folderDetails) => folderDetails?.items.flat() || []
);