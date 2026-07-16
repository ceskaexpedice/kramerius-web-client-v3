import { createFeatureSelector, createSelector } from '@ngrx/store';
import { FoldersState } from './folders.models';
import { foldersFeatureKey } from './folders.reducer';
import { selectUser, selectIsAuthenticated } from '../../../core/auth/store/auth.selectors';
import { DocumentTypeEnum } from '../../constants/document-type';

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

// Section splits of the folder titles response, mirroring the search-results
// page's selectNonPage/Article/Attachment selectors. Tracks are excluded from
// the titles section — the saved-lists page renders them in its own music section.
export const selectFolderNonPageResults = createSelector(
  selectFolderSearchResults,
  (results) => results && results.filter(s =>
    s.model !== DocumentTypeEnum.page &&
    !s.ownModelPath?.includes(DocumentTypeEnum.page) &&
    s.model !== DocumentTypeEnum.article &&
    s.model !== DocumentTypeEnum.supplement &&
    s.model !== DocumentTypeEnum.track
  )
);

export const selectFolderArticleResults = createSelector(
  selectFolderSearchResults,
  (results) => results && results.filter(s => s.model === DocumentTypeEnum.article)
);

export const selectFolderAttachmentResults = createSelector(
  selectFolderSearchResults,
  (results) => results && results.filter(s => s.model === DocumentTypeEnum.supplement)
);

export const selectFolderSearchResultsTotalCount = createSelector(
  selectFoldersState,
  (state: FoldersState) => state.folderSearchResultsTotalCount
);

export const selectFolderPageSearchResults = createSelector(
  selectFoldersState,
  (state) => state.folderPageSearchResults
);

export const selectFolderPageTotalCount = createSelector(
  selectFoldersState,
  (state) => state?.folderPageTotalCount ?? 0
);

export const selectFolderPageResultsLoading = createSelector(
  selectFoldersState,
  (state) => state?.folderPageResultsLoading ?? false
);

export const selectLastFolderSearchPayload = createSelector(
  selectFoldersState,
  (state) => state.lastFolderSearchPayload
);

export const selectFolderCombinedTotalCount = createSelector(
  selectFoldersState,
  (state) => (state?.folderSearchResultsTotalCount ?? 0) + (state?.folderPageTotalCount ?? 0)
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
  | { kind: 'invite'; folderName: string; ownerName: string }
  | { kind: 'follower'; folderName: string; ownerName: string }
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

    // Match the current user against a folder member by account uid, with email
    // as a fallback — mirroring how the ownership selectors resolve identity.
    const matchesUser = (u: { userId: string }) =>
      (!!user?.id && u.userId === user.id) ||
      (!!user?.email && u.userId === user.email);

    // Owners never see a banner.
    if (owner && matchesUser(owner)) {
      return null;
    }

    // A logged-in follower (already a member, not the owner) is offered to copy
    // the shared folder into their own library.
    if (allUsers.some(matchesUser)) {
      return { kind: 'follower', folderName, ownerName };
    }

    // A logged-in user who is not in the folder's users array at all is invited
    // to add (follow) the shared folder.
    return { kind: 'invite', folderName, ownerName };
  }
);