/**
 * Picks which CDK member library to use as the active source for an item.
 * Precedence: explicit URL override (`?source=`) → the Solr `cdk.leader` →
 * first entry in `cdk.collection`. Returns null when nothing usable is available.
 */
export function pickCdkCollection(
  urlSource: string | null | undefined,
  leader: string | null | undefined,
  collections: string[],
): string | null {
  if (urlSource && collections.includes(urlSource)) return urlSource;
  if (leader && collections.includes(leader)) return leader;
  return collections[0] ?? null;
}
