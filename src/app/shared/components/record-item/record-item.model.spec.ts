import { searchDocumentToRecordItem } from './record-item.model';

describe('searchDocumentToRecordItem license mapping', () => {
  // Solr exposes a record's own licenses (`licenses` / `licenses.facet`) separately
  // from those inherited from descendants (`containsLicenses`). Picking the first
  // non-empty field with `||` discarded the rest, so a public work holding a
  // restricted child was rendered from the child's licenses alone and looked locked.

  it('merges own licenses with those contained in descendants', () => {
    const item = searchDocumentToRecordItem({
      pid: 'uuid:1',
      licenses: ['public'],
      containsLicenses: ['dnntt'],
    });
    expect(item.licenses).toContain('public');
    expect(item.licenses).toContain('dnntt');
  });

  it('merges the licenses.facet variant as well', () => {
    const item = searchDocumentToRecordItem({
      pid: 'uuid:2',
      'licenses.facet': ['public'],
      containsLicenses: ['dnntt'],
    });
    expect(item.licenses).toContain('public');
    expect(item.licenses).toContain('dnntt');
  });

  it('deduplicates licenses repeated across fields', () => {
    const item = searchDocumentToRecordItem({
      pid: 'uuid:3',
      licenses: ['public'],
      'licenses.facet': ['public'],
      containsLicenses: ['public'],
    });
    expect(item.licenses).toEqual(['public']);
  });

  it('returns an empty array when the document carries no licenses', () => {
    const item = searchDocumentToRecordItem({ pid: 'uuid:4' });
    expect(item.licenses).toEqual([]);
  });
});
