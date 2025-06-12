export const facetKeysEnum = {
  accessibility: 'accessibility',
  license: 'licenses.facet',
  model: 'model',
  authors: 'authors.facet',
  languages: 'languages.facet',
  genres: 'genres.facet',
  keywords: 'keywords.facet',
  geographic_names: 'geographic_names.facet',
  publishers: 'publishers.facet',
  publication_places: 'publication_places.facet',
  physical_locations: 'physical_locations.facet',
}

export const facetKeys: string[] = [
  facetKeysEnum.accessibility,
  facetKeysEnum.license,
  facetKeysEnum.model,
  facetKeysEnum.authors,
  facetKeysEnum.languages,
  facetKeysEnum.genres,
  facetKeysEnum.keywords,
  facetKeysEnum.geographic_names,
  facetKeysEnum.publishers,
  facetKeysEnum.publication_places,
  facetKeysEnum.physical_locations,
];

export const facetKeysInfinityCount: string[] = [
  facetKeysEnum.accessibility,
  facetKeysEnum.license,
  facetKeysEnum.model,
]

export const customDefinedFacets = [
  {
    facetKey: facetKeysEnum.model,
    title: 'where-to-search.accessibility',
    data: [
      {
        key: 'titles',
        fq: '(model:periodical OR model:monograph OR model:map OR model:graphic OR model:archive OR model:manuscript OR model:soundrecording OR model:sheetmusic OR model:convolute OR (model:collection AND collection.is_standalone:true) OR model:monographunit)',
        name: 'titles',
        count: 0
      },
      {
        key: 'pages',
        fq: '(model:page)',
        name: 'page',
        count: 0
      },
      {
        key: 'articles',
        fq: '(model:article)',
        name: 'article',
        count: 0
      },
      {
        key: 'attachments',
        fq: '(model:supplement)',
        name: 'supplement',
        count: 0
      }
    ]
  }
]
