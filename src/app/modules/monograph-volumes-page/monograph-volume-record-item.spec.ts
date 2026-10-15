import { monographVolumeToRecordItem } from './monograph-volume-record-item';

describe('monographVolumeToRecordItem (issue #190)', () => {
  // A raw Solr doc as returned by SolrService.getChildrenByModel for a
  // monographunit (field names straight from the index, not parsed).
  const rawVolume = {
    pid: 'uuid:vol1',
    model: 'monographunit',
    'title.search': 'Dějiny národu českého v Čechách a v Moravě. 1',
    'root.title': 'Dějiny národu českého v Čechách a v Moravě',
    'root.pid': 'uuid:root',
    'own_parent.pid': 'uuid:root',
    authors: ['Palacký, František, 1798-1876'],
    'date.str': '1936',
    'part.number.sort': 1,
    licenses: ['public'],
    contains_licenses: ['dnntt'],
  };

  it('shows the volume year from date.str on the card', () => {
    expect(monographVolumeToRecordItem(rawVolume).date).toBe('1936');
  });

  it('puts the year on its own line under the title', () => {
    expect(monographVolumeToRecordItem(rawVolume).dateBelowTitle).toBeTrue();
  });

  it('keeps the volume title, part number and parent', () => {
    const item = monographVolumeToRecordItem(rawVolume);
    expect(item.id).toBe('uuid:vol1');
    expect(item.title).toBe('Dějiny národu českého v Čechách a v Moravě. 1');
    expect(item.partNumber).toBe(1);
    expect(item.ownParentPid).toBe('uuid:root');
    expect(item.authors).toEqual(['Palacký, František, 1798-1876']);
  });

  it('merges contains_licenses from the raw doc', () => {
    const item = monographVolumeToRecordItem(rawVolume);
    expect(item.licenses).toContain('public');
    expect(item.licenses).toContain('dnntt');
  });

  it('leaves date empty when the volume has none', () => {
    const { 'date.str': _, ...noDate } = rawVolume;
    expect(monographVolumeToRecordItem(noDate).date).toBeUndefined();
  });
});
