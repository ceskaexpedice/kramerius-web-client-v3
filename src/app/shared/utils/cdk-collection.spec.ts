import { pickCdkCollection } from './cdk-collection';

describe('pickCdkCollection', () => {
  describe('URL source override', () => {
    it('honours ?source= when it is a member of the collection', () => {
      const result = pickCdkCollection('mzk', 'nkp', ['nkp', 'mzk'], [], []);
      expect(result).toBe('mzk');
    });

    it('ignores ?source= when it is not a member of the collection', () => {
      const result = pickCdkCollection('foo', 'nkp', ['nkp', 'mzk'], [], []);
      expect(result).toBe('nkp');
    });
  });

  describe('legacy behaviour (no license info)', () => {
    it('prefers the leader when it is a member of the collection', () => {
      const result = pickCdkCollection(null, 'nkp', ['nkp', 'mzk'], [], []);
      expect(result).toBe('nkp');
    });

    it('falls back to the first collection when the leader is absent', () => {
      const result = pickCdkCollection(null, null, ['mzk', 'nkp'], [], []);
      expect(result).toBe('mzk');
    });

    it('returns null when nothing is available', () => {
      const result = pickCdkCollection(null, null, [], [], []);
      expect(result).toBeNull();
    });
  });

  describe('license-aware selection', () => {
    // The real-data bug: leader is nkp, but only mzk_dnnto grants the user
    // access (no nkp_dnnto). Loading from nkp gives a 403, so mzk must win.
    it('picks the member library whose cdk.licenses the user holds, over the leader', () => {
      const result = pickCdkCollection(
        null,
        'nkp',
        ['nkp', 'mzk'],
        ['mzk_dnnto'],
        ['dnnto'],
      );
      expect(result).toBe('mzk');
    });

    it('keeps the leader when it grants a license the user holds', () => {
      const result = pickCdkCollection(
        null,
        'nkp',
        ['nkp', 'mzk'],
        ['nkp_dnnto', 'mzk_dnnto'],
        ['dnnto'],
      );
      expect(result).toBe('nkp');
    });

    it('prefers the more open license when libraries offer different ones', () => {
      // nkp offers public (open), mzk offers dnnto (restricted). Public wins.
      const result = pickCdkCollection(
        null,
        'mzk',
        ['nkp', 'mzk'],
        ['nkp_public', 'mzk_dnnto'],
        ['public', 'dnnto'],
      );
      expect(result).toBe('nkp');
    });

    it('matches when the user holds the full prefixed license form', () => {
      // The user's own license list carries the prefixed form mzk_public-contract
      // (as seen in real /user data). The mzk copy is the more open one.
      const result = pickCdkCollection(
        null,
        'nkp',
        ['nkp', 'mzk'],
        ['nkp_dnnto', 'mzk_public-contract'],
        ['dnnto', 'mzk_public-contract'],
      );
      expect(result).toBe('mzk');
    });

    it('ignores cdk.licenses the user does not hold and keeps the leader', () => {
      const result = pickCdkCollection(
        null,
        'nkp',
        ['nkp', 'mzk'],
        ['mzk_onsite'],
        ['dnnto'],
      );
      expect(result).toBe('nkp');
    });

    it('lets an explicit ?source= win over license-aware selection', () => {
      const result = pickCdkCollection(
        'nkp',
        'nkp',
        ['nkp', 'mzk'],
        ['mzk_dnnto'],
        ['dnnto'],
      );
      expect(result).toBe('nkp');
    });
  });
});
