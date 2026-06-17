import { of } from 'rxjs';
import { SavedListsPageComponent } from './saved-lists-page.component';
import * as FoldersActions from './state/folders.actions';
import { DontShowDialogs } from '../../shared/services/dont-show-again.service';

describe('SavedListsPageComponent banner logic', () => {
  let component: SavedListsPageComponent;
  let store: { dispatch: jasmine.Spy; select: jasmine.Spy };
  let dontShowAgain: { setDontShowAgain: jasmine.Spy };

  beforeEach(() => {
    jasmine.clock().install();

    store = {
      dispatch: jasmine.createSpy('dispatch'),
      select: jasmine.createSpy('select').and.returnValue(of(null)),
    } as any;
    dontShowAgain = { setDontShowAgain: jasmine.createSpy('setDontShowAgain') } as any;

    const popupPositioning = {
      createPopupState: () => ({ showPopup: () => false, popupPositioned: () => false, closePopup: () => {} }),
      cleanup: () => {},
    };
    const filterService = { selectedTags: of([]) };
    const translate = { instant: (k: string) => k };

    component = new SavedListsPageComponent(
      store as any,
      { snapshot: { paramMap: { get: () => null } }, queryParams: of({}) } as any, // route
      {} as any, // musicService
      {} as any, // soundService
      popupPositioning as any,
      {} as any, // savedListsService
      {} as any, // exportService
      {} as any, // dialog
      { isFavoritesFolder: () => false, getFavoritesDisplayName: () => '' } as any, // foldersService
      filterService as any,
      {} as any, // router
      translate as any,
      dontShowAgain as any,
    );

    // activeFolder is read by onBannerAction; override the store-backed value with a
    // concrete folder for the action tests.
    (component as any).activeFolder = of({ uuid: 'folder-1', name: 'Genealogie' });
  });

  afterEach(() => {
    jasmine.clock().uninstall();
  });

  it('does not persist the preference when only the checkbox is toggled', () => {
    component.onBannerDontShow(true);
    expect(dontShowAgain.setDontShowAgain).not.toHaveBeenCalled();
  });

  it('persists the preference on Save when the checkbox was checked', () => {
    component.onBannerDontShow(true);
    component.onBannerAction('save');
    expect(dontShowAgain.setDontShowAgain)
      .toHaveBeenCalledWith(DontShowDialogs.SharedFolderBanner);
  });

  it('does not persist the preference on Save when the checkbox was unchecked', () => {
    component.onBannerAction('save');
    expect(dontShowAgain.setDontShowAgain).not.toHaveBeenCalled();
  });

  it('hides the banner for the session on close without persisting when unchecked', () => {
    component.onBannerClose();
    expect(component.bannerDismissed()).toBe(true);
    expect(dontShowAgain.setDontShowAgain).not.toHaveBeenCalled();
  });

  it('persists the preference on close when the checkbox was checked', () => {
    component.onBannerDontShow(true);
    component.onBannerClose();
    expect(component.bannerDismissed()).toBe(true);
    expect(dontShowAgain.setDontShowAgain)
      .toHaveBeenCalledWith(DontShowDialogs.SharedFolderBanner);
  });

  it('dispatches followFolder and shows the success banner on Save', () => {
    component.onBannerAction('save');
    expect(store.dispatch)
      .toHaveBeenCalledWith(FoldersActions.followFolder({ uuid: 'folder-1' }));
    expect(component.savedBannerVisible()).toBe(true);
  });

  it('hides the success banner after 5 seconds', () => {
    component.onBannerAction('save');
    expect(component.savedBannerVisible()).toBe(true);
    jasmine.clock().tick(5000);
    expect(component.savedBannerVisible()).toBe(false);
  });

  it('dispatches unfollowFolder and shows no success banner on Remove', () => {
    component.onBannerAction('remove');
    expect(store.dispatch)
      .toHaveBeenCalledWith(FoldersActions.unfollowFolder({ uuid: 'folder-1' }));
    expect(component.savedBannerVisible()).toBe(false);
  });
});
