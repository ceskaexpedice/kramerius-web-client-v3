import { normalizeForComparison } from './normalize-text';

describe('normalizeForComparison', () => {
  it('lowercases and collapses whitespace', () => {
    expect(normalizeForComparison('  Hello   World  ')).toBe('hello world');
  });

  it('strips HTML tags', () => {
    expect(normalizeForComparison('<p>Hello <b>World</b></p>')).toBe('hello world');
  });

  it('strips punctuation and typographic quotes', () => {
    expect(normalizeForComparison('Co znamená pojem „Díla nedostupná na trhu“?'))
      .toBe('co znamená pojem díla nedostupná na trhu');
  });

  it('treats strings differing only in punctuation as equal', () => {
    expect(normalizeForComparison('Out-of-commerce works?'))
      .toBe(normalizeForComparison('Out of commerce works'));
  });

  it('preserves diacritics', () => {
    expect(normalizeForComparison('Studovňa')).toBe('studovňa');
  });

  it('handles an empty string', () => {
    expect(normalizeForComparison('')).toBe('');
  });
});
