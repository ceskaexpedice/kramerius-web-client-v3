import { CustomSearchService } from './custom-search.service';
import { customDefinedFacetsEnum, facetKeysEnum } from '../../modules/search-results-page/const/facets';
import { DocumentTypeEnum } from '../../modules/constants/document-type';

describe('CustomSearchService.getSolrFqFilters', () => {

  // The service injects router/user/query-param collaborators that this suite never
  // exercises — getSolrFqFilters only reads the applied-filters signal. Build the
  // instance without Angular's injector and seed that signal directly.
  const serviceWithFilters = (filters: string[]): CustomSearchService => {
    const service = Object.create(CustomSearchService.prototype) as CustomSearchService;
    (service as any)._appliedFilters = () => filters;
    return service;
  };

  const docTypeFilter = (model: string) => `${customDefinedFacetsEnum.model}:${model}`;

  it('maps a convolute document-type filter onto the document\'s own model field', () => {
    const fq = serviceWithFilters([docTypeFilter(DocumentTypeEnum.convolute)]).getSolrFqFilters();

    // root.model:convolute would also match every work bound inside a convolute
    // (monographs, sheetmusic, graphics), inflating the result count ~4x.
    expect(fq).toEqual([`${facetKeysEnum.model}:${DocumentTypeEnum.convolute}`]);
  });

  it('keeps root.model for document types whose children should be included', () => {
    const fq = serviceWithFilters([
      docTypeFilter(DocumentTypeEnum.periodical),
      docTypeFilter(DocumentTypeEnum.monograph),
    ]).getSolrFqFilters();

    expect(fq).toEqual([
      `${facetKeysEnum.rootModel}:${DocumentTypeEnum.periodical}`,
      `${facetKeysEnum.rootModel}:${DocumentTypeEnum.monograph}`,
    ]);
  });

  it('maps only the convolute entry when mixed with other document types', () => {
    const fq = serviceWithFilters([
      docTypeFilter(DocumentTypeEnum.monograph),
      docTypeFilter(DocumentTypeEnum.convolute),
    ]).getSolrFqFilters();

    expect(fq).toEqual([
      `${facetKeysEnum.rootModel}:${DocumentTypeEnum.monograph}`,
      `${facetKeysEnum.model}:${DocumentTypeEnum.convolute}`,
    ]);
  });

  it('does not remap "convolute" coming from the where-to-search facet', () => {
    // whereToSearchModel already targets `model`; the convolute special-case must
    // not leak into other facets that happen to carry the same value.
    const fq = serviceWithFilters([
      `${customDefinedFacetsEnum.whereToSearchModel}:page`,
    ]).getSolrFqFilters();

    expect(fq).toEqual([`${facetKeysEnum.model}:page`]);
  });
});
