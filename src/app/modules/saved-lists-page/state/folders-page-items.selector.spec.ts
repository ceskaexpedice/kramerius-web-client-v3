import {
  selectFolderNonPageResults,
  selectFolderPageSearchResults,
  selectFolderCombinedTotalCount,
} from './folders.selectors';

// Real data from folder "Test - stránky"
// (5e1335b5-e168-463c-be0f-e2c878c56417): two saved items, both model:page.
// The folder listing (no text query) returns them in `folderSearchResults`.
const savedPageA = {
  pid: 'uuid:cc83aa90-fff9-11e7-9854-5ef3fc9ae867',
  model: 'page',
  title: '8',
  ownModelPath: 'periodical/periodicalvolume/periodicalitem/page',
} as any;

const savedPageB = {
  pid: 'uuid:2ceca949-b041-4f58-921e-0a83941b97d5',
  model: 'page',
  title: '[27]',
  ownModelPath: 'monograph/page',
} as any;

const savedMonograph = {
  pid: 'uuid:d10e5710-b53a-11ea-998c-005056827e51',
  model: 'monograph',
  title: 'Nějaká monografie',
  ownModelPath: 'monograph',
} as any;

/** Folder listing state: the exact-scope search put every saved item here. */
const stateWithSavedPages = {
  folders: {
    folderSearchResults: [savedMonograph, savedPageA, savedPageB],
    // No text query → the lazy pages effect short-circuits to [].
    folderPageSearchResults: [],
  },
} as any;

describe('folder listing with page-level saved items', () => {
  it('excludes page-level items from the titles section', () => {
    const titles = selectFolderNonPageResults(stateWithSavedPages);
    expect(titles).toEqual([savedMonograph]);
  });

  it('renders saved page-level items somewhere in the folder listing', () => {
    const titles = selectFolderNonPageResults(stateWithSavedPages) ?? [];
    const pages = selectFolderPageSearchResults(stateWithSavedPages) ?? [];
    const renderedPids = [...titles, ...pages].map((d: any) => d.pid);

    // Both saved pages must appear in the listing; today they appear in neither
    // section, so the folder renders as empty.
    expect(renderedPids).toContain(savedPageA.pid);
    expect(renderedPids).toContain(savedPageB.pid);
  });
});

// The folder listing's numFound already counts the saved pages, and the lazy
// pages request is skipped without a text query — so the paginator total must
// not double-count them.
describe('folder combined total count with page-level saved items', () => {
  it('counts each saved page once', () => {
    const state = {
      folders: {
        folderSearchResults: [savedMonograph, savedPageA, savedPageB],
        folderPageSearchResults: [],
        folderSearchResultsTotalCount: 3,
        folderPageTotalCount: 0,
      },
    } as any;

    expect(selectFolderCombinedTotalCount(state)).toBe(3);
  });

  it('does not duplicate a saved page that the fulltext pages request also returns', () => {
    const state = {
      folders: {
        folderSearchResults: [savedPageA],
        // With a text query the subtree-scoped lazy request can return the
        // saved page itself.
        folderPageSearchResults: [savedPageA, { pid: 'uuid:other-page', model: 'page' }],
      },
    } as any;

    const pids = selectFolderPageSearchResults(state).map((d: any) => d.pid);
    expect(pids).toEqual([savedPageA.pid, 'uuid:other-page']);
  });
});
