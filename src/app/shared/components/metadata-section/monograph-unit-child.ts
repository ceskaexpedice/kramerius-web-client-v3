import { Metadata, TitleInfo } from '../../models/metadata.model';

/**
 * Heading of a multivolume part, built from its own MODS titleInfo:
 * "1. Od prvověkosti až do roku 1253". The primary title of a unit repeats
 * the multivolume title, which the panel already shows above, so the part
 * number and name are what tell the reader which volume this is (#190).
 */
export function monographUnitHeading(titles: TitleInfo[] | undefined): string {
  const primary = titles?.find(t => !t.type) ?? titles?.[0];
  if (!primary) return '';
  const number = primary.partNumber?.trim() ?? '';
  const name = primary.partName?.trim() ?? '';
  if (number && name) return `${number.replace(/\.$/, '')}. ${name}`;
  return number || name || primary.title || '';
}

/**
 * The volume card of a multivolume part shows the part's own imprint
 * (place, publisher, year). The panel's primary data is the multivolume
 * title's MODS, whose imprint usually lacks place and year, so without this
 * the volume's place and year never reach the reader (#190).
 *
 * Returns a copy — the input comes from the MODS cache and must stay intact.
 * The year comes from the unit's Solr `date.str`, and only when no MODS
 * publisher already states one, so it is never printed twice.
 */
export function buildMonographUnitChildData(child: Metadata, solrDateStr: string | undefined): Metadata {
  const copy: Metadata = Object.assign(Object.create(Object.getPrototypeOf(child)), child);
  const publishers = child.publishers ?? [];
  const publisherHasDate = publishers.some(p => !!p.date);
  copy.dateStr = child.dateStr || (publisherHasDate ? '' : (solrDateStr ?? ''));
  return copy;
}

/** Whether the unit's card has anything worth showing. */
export function hasMonographUnitChildContent(child: Metadata): boolean {
  return !!(
    monographUnitHeading(child.titles) ||
    child.dateStr ||
    child.publishers?.length ||
    child.authors?.length ||
    child.languages?.length ||
    child.locations?.length ||
    child.notes?.length
  );
}
