export enum SolrSortFields  {
  createdAt = 'created',
  title = 'title.sort',
  count = 'count',
  index = 'index',
  dateMin = 'date.min',
  dateMax = 'date.max',
  relevance = 'score'
}

export enum SolrSortDirections {
  asc = 'asc',
  desc = 'desc'
}

export enum SolrOperators {
  and = 'AND',
  or = 'OR'
}
