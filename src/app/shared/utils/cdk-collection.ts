import { sortLicenses } from '../../core/solr/solr-misc';

/**
 * Picks which CDK member library to use as the active source for an item.
 *
 * Precedence:
 *   1. explicit URL override (`?source=`)
 *   2. the member library whose `cdk.licenses` grants the current user a usable
 *      license — preferring the most open one (see below)
 *   3. the Solr `cdk.leader`
 *   4. first entry in `cdk.collection`
 *
 * Why step 2 exists: `cdk.leader` names the library that owns the record for
 * display/metadata, but it is not necessarily the library whose copy the current
 * user may actually read. A `dnnto` document can carry `cdk.licenses: [mzk_dnnto]`
 * with no `nkp_dnnto`, meaning only MZK's copy grants the user access even though
 * the leader is NKP — loading images from NKP then 403s. Similarly, if one library
 * offers `public` and another `dnnto`, the more open copy should win. We resolve
 * this from `cdk.licenses` (entries are `<collection>_<license>`) against the
 * user's own licenses, ranked by openness via `sortLicenses`.
 *
 * Returns null when nothing usable is available.
 */
export function pickCdkCollection(
  urlSource: string | null | undefined,
  leader: string | null | undefined,
  collections: string[],
  cdkLicenses: string[] = [],
  userLicenses: string[] = [],
): string | null {
  if (urlSource && collections.includes(urlSource)) return urlSource;

  const licenseAware = pickByAccessibleLicense(leader, collections, cdkLicenses, userLicenses);
  if (licenseAware) return licenseAware;

  if (leader && collections.includes(leader)) return leader;
  return collections[0] ?? null;
}

/**
 * From `cdk.licenses` (`<collection>_<license>` entries), find the collection that
 * grants the user the most open license. Ties are broken in favour of the leader,
 * then collection order. Returns null when no entry grants the user any license.
 */
function pickByAccessibleLicense(
  leader: string | null | undefined,
  collections: string[],
  cdkLicenses: string[],
  userLicenses: string[],
): string | null {
  if (!cdkLicenses.length || !userLicenses.length) return null;

  // Best (most open) accessible license per collection.
  const bestByCollection = new Map<string, string>();
  for (const entry of cdkLicenses) {
    const parsed = parseCdkLicense(entry, collections);
    if (!parsed) continue;
    const { collection, license, full } = parsed;
    // The user must hold either the bare license or its full prefixed form.
    if (!userLicenses.includes(license) && !userLicenses.includes(full)) continue;
    // Rank by whichever form the license order knows (config IDs are sometimes
    // prefixed, e.g. `mzk_public-contract`, sometimes bare, e.g. `dnnto`).
    const rankable = rankableLicense(license, full);
    const current = bestByCollection.get(collection);
    if (!current || isMoreOpen(rankable, current)) {
      bestByCollection.set(collection, rankable);
    }
  }

  if (!bestByCollection.size) return null;

  // Rank collections by their best license's openness; leader wins ties, then
  // original collection order.
  const candidates = [...bestByCollection.keys()];
  candidates.sort((a, b) => {
    const la = bestByCollection.get(a)!;
    const lb = bestByCollection.get(b)!;
    if (la !== lb) return isMoreOpen(la, lb) ? -1 : 1;
    if (a === leader) return -1;
    if (b === leader) return 1;
    return collections.indexOf(a) - collections.indexOf(b);
  });
  return candidates[0];
}

/**
 * Splits a `cdk.licenses` entry into its collection code and license, matching the
 * code against the known collection list so licenses whose own value contains an
 * underscore (e.g. `mzk_public-contract`, `knav_public_contract`) split correctly.
 */
function parseCdkLicense(
  entry: string,
  collections: string[],
): { collection: string; license: string; full: string } | null {
  const collection = collections.find(c => entry.startsWith(`${c}_`));
  if (!collection) return null;
  return { collection, license: entry.slice(collection.length + 1), full: entry };
}

/**
 * Returns whichever of the bare or full license form the license order recognises,
 * so ranking works whether the configured license ID is prefixed (`mzk_public-contract`)
 * or bare (`dnnto`). Prefers a known form over an unknown one, then the more open.
 */
function rankableLicense(bare: string, full: string): string {
  if (bare === full) return bare;
  const [first] = sortLicenses([bare, full]);
  return first;
}

/** True when license `a` is strictly more open than license `b`. */
function isMoreOpen(a: string, b: string): boolean {
  return sortLicenses([a, b])[0] === a && a !== b;
}
