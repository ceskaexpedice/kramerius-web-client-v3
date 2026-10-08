import { Location } from '../models/metadata.model';

/**
 * Folds the locations of one holding institution into a single entry.
 *
 * A periodical held as many volumes lists one shelf locator per volume batch,
 * each under the same institution, and showing every one as its own row
 * repeats the institution name down the panel. Grouped, the institution is
 * named once and its locators are joined on the secondary line.
 *
 * Locations without an institution stay as they are: there is nothing to group
 * them under, and their locator is their primary line. Order follows the first
 * appearance of each institution.
 */
export function groupLocationsByInstitution(locations: Location[]): Location[] {
  const grouped: Location[] = [];
  const byInstitution = new Map<string, Location>();
  const seenLocators = new Map<string, Set<string>>();

  for (const location of locations) {
    const institution = location.physicalLocation;
    if (!institution) {
      grouped.push(location);
      continue;
    }

    const existing = byInstitution.get(institution);
    if (!existing) {
      const copy = Object.assign(new Location(), location);
      byInstitution.set(institution, copy);
      seenLocators.set(institution, new Set([location.shelfLocator]));
      grouped.push(copy);
      continue;
    }

    const seen = seenLocators.get(institution)!;
    if (location.shelfLocator && !seen.has(location.shelfLocator)) {
      seen.add(location.shelfLocator);
      existing.shelfLocator = existing.shelfLocator
        ? `${existing.shelfLocator}, ${location.shelfLocator}`
        : location.shelfLocator;
    }
  }

  return grouped;
}
