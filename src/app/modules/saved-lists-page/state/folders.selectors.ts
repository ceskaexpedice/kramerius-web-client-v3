import { createFeatureSelector, createSelector } from '@ngrx/store';
import { FoldersState } from './folders.models';
import { foldersFeatureKey } from './folders.reducer';
import { selectUser, selectIsAuthenticated } from '../../../core/auth/store/auth.selectors';

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
  selectUser,
  (folders, user) => {
    if (!user?.id) return [];
    
    return folders.filter(folder => 
      folder.users.some(userGroup => 
        userGroup.some(folderUser => 
          folderUser.userRole === 'owner' && folderUser.userId === user.id
        )
      )
    );
  }
);

export const selectUserFollowedFolders = createSelector(
  selectAllFolders,
  selectUser,
  (folders, user) => {
    if (!user?.id) return [];
    
    return folders.filter(folder => 
      folder.users.some(userGroup => 
        userGroup.some(folderUser => 
          folderUser.userRole === 'follower' && folderUser.userId === user.id
        )
      )
    );
  }
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

export const selectFolderFacets = createSelector(
  selectFoldersState,
  (state: FoldersState) => state.folderFacets
);

export const selectActiveFolderItems = createSelector(
  selectFolderDetails,
  (folderDetails) => folderDetails?.items.flat() || []
);

export const selectSearchQuery = createSelector(
  selectFoldersState,
  (state: FoldersState) => state.searchQuery
);

export const selectSortParams = createSelector(
  selectFoldersState,
  (state: FoldersState) => ({ sortBy: state.sortBy, sortDirection: state.sortDirection })
);

// New selectors for folder items mapping
export const selectFolderItemsMapping = createSelector(
  selectFoldersState,
  (state: FoldersState) => state.folderItemsMapping
);

export const selectFolderItemsMappingLoading = createSelector(
  selectFoldersState,
  (state: FoldersState) => state.folderItemsMappingLoading
);

export type FolderBannerState =
  | { kind: 'login'; folderName: string; ownerName: string }
  | { kind: 'shared'; folderName: string; ownerName: string }
  | null;

export const selectFolderBannerState = createSelector(
  selectIsAuthenticated,
  selectUser,
  selectFolderDetails,
  (isAuthenticated, user, folder): FolderBannerState => {
    if (!folder) return null;

    const allUsers = (folder.users ?? []).flat();
    const owner = allUsers.find(u => u.userRole === 'owner');
    const ownerName = owner?.userId ?? '';
    const folderName = folder.name ?? '';

    if (!isAuthenticated) {
      return { kind: 'login', folderName, ownerName };
    }

    // The banner offers to add a shared folder to the user's library. Show it
    // whenever the logged-in user is NOT the owner of the open folder — i.e. a
    // follower (whether or not they've added it) or a non-member. Owners never
    // see it. Match against user.id (the account uid) as the ownership selectors
    // do, with email as a fallback.
    const isOwner =
      !!owner &&
      ((!!user?.id && owner.userId === user.id) ||
        (!!user?.email && owner.userId === user.email));
    if (!isOwner) {
      return { kind: 'shared', folderName, ownerName };
    }
    return null;
  }
);