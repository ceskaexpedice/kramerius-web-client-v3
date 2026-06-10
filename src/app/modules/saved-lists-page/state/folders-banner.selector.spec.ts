import { selectFolderBannerState } from './folders.selectors';

// "Bla bla" from real data: current user 1185@mzk.cz is a follower, owner is someone else.
const followerFolder = {
  name: 'Bla bla',
  uuid: '0b14e888-b593-4562-b136-e13f7573203b',
  itemsCount: 8,
  items: [],
  updatedAt: '',
  users: [[
    { createdAt: '', userRole: 'follower', userId: '1185@mzk.cz' },
    { createdAt: '', userRole: 'owner', userId: 'jan.rychtar@trinera.cz' },
  ]],
} as any;

// "Cestopisy" from real data: current user 1185@mzk.cz is the owner.
const ownedFolder = {
  name: 'Cestopisy',
  uuid: 'd1cf023c-0d9b-48ee-9042-ade47762a8e0',
  itemsCount: 24,
  items: [],
  updatedAt: '',
  users: [[
    { createdAt: '', userRole: 'owner', userId: '1185@mzk.cz' },
  ]],
} as any;

const user = { id: '1185@mzk.cz', email: 'user@mzk.cz' } as any;

describe('selectFolderBannerState', () => {
  it('returns null when no folder is loaded', () => {
    const result = selectFolderBannerState.projector(true, user, null);
    expect(result).toBeNull();
  });

  it('returns "login" when anonymous and a folder is loaded', () => {
    const result = selectFolderBannerState.projector(false, null, followerFolder);
    expect(result?.kind).toBe('login');
    expect(result?.folderName).toBe('Bla bla');
    expect(result?.ownerName).toBe('jan.rychtar@trinera.cz');
  });

  it('returns null when the authenticated user IS the owner', () => {
    const result = selectFolderBannerState.projector(true, user, ownedFolder);
    expect(result).toBeNull();
  });

  it('returns "follower" when the authenticated user is a follower (not owner)', () => {
    const result = selectFolderBannerState.projector(true, user, followerFolder);
    expect(result?.kind).toBe('follower');
    expect(result?.ownerName).toBe('jan.rychtar@trinera.cz');
  });

  it('returns "invite" when the authenticated user is not a member at all', () => {
    const result = selectFolderBannerState.projector(
      true,
      { id: 'stranger@mzk.cz' } as any,
      followerFolder
    );
    expect(result?.kind).toBe('invite');
  });

  it('matches ownership by email when id does not match', () => {
    const emailOwned = {
      ...ownedFolder,
      users: [[{ createdAt: '', userRole: 'owner', userId: 'owner@mzk.cz' }]],
    } as any;
    const result = selectFolderBannerState.projector(
      true,
      { id: 'someid', email: 'owner@mzk.cz' } as any,
      emailOwned
    );
    expect(result).toBeNull();
  });
});
