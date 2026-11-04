import { normalizeLicenseBar } from './license-bar';

/**
 * A license `bar` is hand-written per library in `config-licenses.json`. A bar with
 * no `licenses` list used to throw in the detail view and leave it stuck on a
 * spinner, so every shape a library might write must come out usable.
 */
describe('normalizeLicenseBar', () => {
  const label = { cs: 'Biologické centrum AV ČR', en: 'Biology Centre CAS' };

  it('keeps a well-formed bar as written', () => {
    const bar = { licenses: ['knav_ustav_BU'], text: { cs: 'BC' }, logo: '/x.png' };
    expect(normalizeLicenseBar(bar, 'knav_ustav_BU', label)).toEqual(bar);
  });

  it('falls back to the license own id when licenses are missing', () => {
    expect(normalizeLicenseBar({ text: { cs: 'BC' } }, 'knav_ustav_BU', label)?.licenses)
      .toEqual(['knav_ustav_BU']);
  });

  it('falls back to the license own id when licenses are null or empty', () => {
    expect(normalizeLicenseBar({ licenses: null }, 'knav_ustav_BU')?.licenses).toEqual(['knav_ustav_BU']);
    expect(normalizeLicenseBar({ licenses: [] }, 'knav_ustav_BU')?.licenses).toEqual(['knav_ustav_BU']);
  });

  it('accepts a single license written as a string', () => {
    expect(normalizeLicenseBar({ licenses: 'knav_ustav_BU' }, 'x')?.licenses).toEqual(['knav_ustav_BU']);
  });

  it('drops non-string items from the license list', () => {
    expect(normalizeLicenseBar({ licenses: ['knav_ustav_BU', 3, null, ''] }, 'x')?.licenses)
      .toEqual(['knav_ustav_BU']);
  });

  it('keeps the case of license ids', () => {
    expect(normalizeLicenseBar({ licenses: ['knav_ustav_BU'] }, 'x')?.licenses).toEqual(['knav_ustav_BU']);
  });

  it('uses the license label when the text is missing', () => {
    expect(normalizeLicenseBar({ licenses: ['a'] }, 'a', label)?.text).toEqual(label);
  });

  it('uses a plain-string text for every language', () => {
    expect(normalizeLicenseBar({ licenses: ['a'], text: 'BC' }, 'a', label)?.text).toEqual({ en: 'BC' });
  });

  it('drops a bar that is not an object', () => {
    expect(normalizeLicenseBar(null, 'a')).toBeUndefined();
    expect(normalizeLicenseBar('bar', 'a')).toBeUndefined();
    expect(normalizeLicenseBar(['a'], 'a')).toBeUndefined();
  });
});
