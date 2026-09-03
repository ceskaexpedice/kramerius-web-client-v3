import { Author, Metadata, Publisher, TitleInfo, mergeMetadata } from './metadata.model';

/**
 * ModsParserService caches parsed MODS and returns the SAME Metadata object to
 * every caller. mergeMetadata used to adopt that object's nested authors,
 * publishers and titles by reference and mutate them in place. Once the merged
 * result reached the NgRx store it was deep-frozen — which froze the cached MODS
 * too — so opening the same document a second time threw
 * "Cannot assign to read only property 'date'".
 */
describe('mergeMetadata and the shared MODS cache', () => {

  function modsWithAuthor(): Metadata {
    const mods = new Metadata();

    const author = new Author();
    author.name = 'Karel Capek';
    author.date = '1890-1938';
    author.roles = ['aut'];
    mods.authors = [author];

    const publisher = new Publisher();
    publisher.name = 'Aventinum';
    publisher.place = 'Praha';
    mods.publishers = [publisher];

    const title = new TitleInfo();
    title.title = 'Povetron';
    mods.titles = [title];

    return mods;
  }

  function solrWithSameAuthor(): Metadata {
    const solr = new Metadata();
    const author = new Author();
    author.name = 'Karel Capek';
    solr.authors = [author];
    return solr;
  }

  it('does not put the cached MODS objects into the merged result', () => {
    const mods = modsWithAuthor();
    const merged = mergeMetadata(new Metadata(), mods);

    expect(merged.authors[0]).not.toBe(mods.authors[0]);
    expect(merged.publishers[0]).not.toBe(mods.publishers[0]);
    expect(merged.titles[0]).not.toBe(mods.titles[0]);
  });

  it('leaves the cached MODS untouched when enriching a Solr author', () => {
    const mods = modsWithAuthor();
    mergeMetadata(solrWithSameAuthor(), mods);

    expect(mods.authors[0].date).toBe('1890-1938');
    expect(mods.authors[0].roles).toEqual(['aut']);
  });

  it('merges a second time after the first result was frozen', () => {
    // Exactly what NgRx does to the store: deep-freeze everything it holds.
    const deepFreeze = (value: any): any => {
      if (value && typeof value === 'object' && !Object.isFrozen(value)) {
        Object.freeze(value);
        Object.values(value).forEach(deepFreeze);
      }
      return value;
    };

    const mods = modsWithAuthor();

    // First open: Solr knows nothing, so the MODS author is ADOPTED into the
    // result. Storing that result freezes it — and, before the fix, the cached
    // MODS author with it, since they were the same object.
    const stored = deepFreeze(mergeMetadata(new Metadata(), mods));

    // Second open: the frozen author now arrives on the SOLR side (read back
    // from the store) while MODS supplies a DIFFERENT date, so the enrich branch
    // performs a real write to a frozen property. That is the reported
    // TypeError: Cannot assign to read only property 'date'.
    const solrFromStore = new Metadata();
    solrFromStore.authors = stored.authors;

    const richerMods = modsWithAuthor();
    richerMods.authors[0].date = '1890-1938 (revised)';

    expect(() => mergeMetadata(solrFromStore, richerMods)).not.toThrow();
  });

  it('still enriches the Solr author from MODS', () => {
    const merged = mergeMetadata(solrWithSameAuthor(), modsWithAuthor());

    expect(merged.authors.length).toBe(1);
    expect(merged.authors[0].date).toBe('1890-1938');
    expect(merged.authors[0].roles).toEqual(['aut']);
  });

  it('keeps prototype methods on the cloned MODS objects', () => {
    // A plain deep clone would strip these and break callers like
    // rootMods.titles[0].mainTitle().
    const merged = mergeMetadata(new Metadata(), modsWithAuthor());

    expect(typeof merged.titles[0].mainTitle).toBe('function');
    expect(typeof merged.publishers[0].placeAndName).toBe('function');
  });

});
