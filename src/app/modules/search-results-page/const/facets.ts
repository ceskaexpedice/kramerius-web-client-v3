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

export enum customDefinedFacetsEnum {
  model = 'custom-model',
  whereToSearchModel = 'custom-where-to-search.model',
}

export const customDefinedFacetsKeys: string[] = [
  customDefinedFacetsEnum.model,
  customDefinedFacetsEnum.whereToSearchModel
]

export const facetKeysInfinityCount: string[] = [
  facetKeysEnum.accessibility,
  facetKeysEnum.license,
  facetKeysEnum.model,
  customDefinedFacetsEnum.model,
  customDefinedFacetsEnum.whereToSearchModel
]

export const customDefinedFacets = [
  {
    facetKey: facetKeysEnum.model,
    title: facetKeysEnum.model,
    data: [
      {
        key: 'periodical',
        fq: [
          'periodical'
        ],
        name: 'periodical',
        count: 0
      },
      {
        key: 'monograph',
        fq: [
          'monograph'
        ],
        name: 'monograph',
        count: 0
      },
      {
        key: 'map',
        fq: [
          'map'
        ],
        name: 'map',
        count: 0
      },
      {
        key: 'graphic',
        fq: [
          'graphic'
        ],
        name: 'graphic',
        count: 0
      },
      {
        key: 'archive',
        fq: [
          'archive'
        ],
        name: 'archive',
        count: 0
      },
      {
        key: 'manuscript',
        fq: [
          'manuscript'
        ],
        name: 'manuscript',
        count: 0
      },
      {
        key: 'soundrecording',
        fq: [
          'soundrecording'
        ],
        name: 'soundrecording',
        count: 0
      },
      {
        key: 'sheetmusic',
        fq: [
          'sheetmusic'
        ],
        name: 'sheetmusic',
        count: 0
      },
      {
        key: 'convolute',
        fq: [
          'convolute'
        ],
        name: 'convolute',
        count: 0
      },
      {
        key: 'collection',
        fq: [
          '(model:collection AND collection.is_standalone:true)'
        ],
        name: 'collection',
        count: 0
      },
      {
        key: 'monographunit',
        fq: [
          'monographunit'
        ],
        name: 'monographunit',
        count: 0
      }
    ]
  },
  {
    facetKey: facetKeysEnum.model,
    title: customDefinedFacetsEnum.whereToSearchModel,
    data: [
      {
        key: 'titles',
        fq: [
          'periodical',
          'monograph',
          'map',
          'graphic',
          'archive',
          'manuscript',
          'soundrecording',
          'sheetmusic',
          'convolute',
          'collection',
          'monographunit'
        ],
        name: 'titles',
        count: 0
      },
      {
        key: 'pages',
        fq: 'page',
        name: 'page',
        count: 0
      },
      {
        key: 'articles',
        fq: 'article',
        name: 'article',
        count: 0
      },
      {
        key: 'attachments',
        fq: 'supplement',
        name: 'supplement',
        count: 0
      }
    ]
  }
]
