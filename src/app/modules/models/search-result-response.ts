export interface SearchResultResponse {
  response: {
    numFound: number;
    start: number;
    docs: any[];
  };
  facet_counts: {
    facet_fields: {
      [field: string]: (string | number)[];
    };
  };
}
