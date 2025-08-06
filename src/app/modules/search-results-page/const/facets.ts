export enum FacetElementType {
  checkbox = 'checkbox',
  radio = 'radio',
  range = 'range',
}

export enum FacetAccessibilityTypes {
  all = 'all',
  available = 'available'
}


export const facetKeysEnum = {
  accessibility: 'accessibility',
  license: 'licenses.facet',
  model: 'model',
  rootModel: 'root.model',
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
  accessibility = 'custom-accessibility',
  model = 'custom-root-model',
  whereToSearchModel = 'custom-where-to-search.model',
}

export const customDefinedFacetsKeys: string[] = [
  customDefinedFacetsEnum.accessibility,
  customDefinedFacetsEnum.model,
  customDefinedFacetsEnum.whereToSearchModel
]

export const facetKeysInfinityCount: string[] = [
  facetKeysEnum.accessibility,
  facetKeysEnum.license,
  facetKeysEnum.model,
  customDefinedFacetsEnum.accessibility,
  customDefinedFacetsEnum.model,
  customDefinedFacetsEnum.whereToSearchModel
]

export const customDefinedFacets = [
  {
    facetKey: customDefinedFacetsEnum.accessibility,
    title: customDefinedFacetsEnum.accessibility,
    solrFacetKey: facetKeysEnum.license,
    solrFacetKeyForCount: facetKeysEnum.license,
    type: FacetElementType.radio,
    data: [
      {
        key: FacetAccessibilityTypes.all,
        fq: null,
        name: `${FacetAccessibilityTypes.all}`,
        count: 0,
        type: FacetElementType.radio,
      },
      {
        key: FacetAccessibilityTypes.available,
        fq: [],
        name: `${FacetAccessibilityTypes.available}`,
        count: 0,
        type: FacetElementType.radio,
      }
    ]
  },
  {
    facetKey: customDefinedFacetsEnum.model,
    title: customDefinedFacetsEnum.model,
    solrFacetKey: facetKeysEnum.rootModel,
    solrFacetKeyForCount: facetKeysEnum.model,
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
    facetKey: customDefinedFacetsEnum.whereToSearchModel,
    title: customDefinedFacetsEnum.whereToSearchModel,
    solrFacetKey: facetKeysEnum.model,
    solrFacetKeyForCount: facetKeysEnum.model,
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
        key: 'periodicalvolume',
        fq: 'periodicalvolume',
        name: 'periodicalvolume',
        count: 0
      },
      {
        key: 'periodicalitem',
        fq: 'periodicalitem',
        name: 'periodicalitem',
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
