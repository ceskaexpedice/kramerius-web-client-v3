import { advancedFulltextTerm } from './advanced-fulltext-term';

describe('advancedFulltextTerm', () => {
  it('returns nothing without a full-text condition', () => {
    expect(advancedFulltextTerm(undefined)).toBe('');
    expect(advancedFulltextTerm('(authors.search:"Masaryk")')).toBe('');
  });

  it('reads a single word', () => {
    expect(advancedFulltextTerm('(text_ocr:(Hodonín))')).toBe('Hodonín');
    expect(advancedFulltextTerm('(text_ocr:"Hodonín")')).toBe('Hodonín');
  });

  it('keeps a multi-word value as a phrase', () => {
    expect(advancedFulltextTerm('(text_ocr:("Masarykova univerzita"))')).toBe('"Masarykova univerzita"');
    expect(advancedFulltextTerm('(text_ocr:"Masarykova univerzita")')).toBe('"Masarykova univerzita"');
    expect(advancedFulltextTerm('(text_ocr:""Masarykova univerzita"")')).toBe('"Masarykova univerzita"');
  });

  it('reads the case-sensitive field', () => {
    expect(advancedFulltextTerm('(text_ocr.exact:(Brno))')).toBe('Brno');
  });

  it('joins several conditions and skips other fields and negations', () => {
    const query = '((text_ocr:(Brno) OR text_ocr:(Olomouc)) AND (title.search:"Noviny" AND -text_ocr:(Praha)))';
    expect(advancedFulltextTerm(query)).toBe('Brno Olomouc');
  });
});
