export const SolrFields = {
  id: 'pid',
  model: 'model',
  title: 'title.search',
  createdAt: 'created',
  authors: 'authors',
  authorsSearch: 'authors.search',
  authorsFacet: 'authors.facet',
  keywordsSearch: 'keywords.search',
  keywordsFacet: 'keywords.facet',
  genresFacet: 'genres.facet',
  languagesFacet: 'languages.facet',
  accessibility: 'accessibility',
};

export function field(name: keyof typeof SolrFields): string {
  return SolrFields[name];
}
