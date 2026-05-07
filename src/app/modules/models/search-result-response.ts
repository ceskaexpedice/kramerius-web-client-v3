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
    facet_queries?: {
      [query: string]: number;
    };
  };
  highlighting?: {
    [docId: string]: {
      text_ocr?: string[];
    };
  };
  grouped?: {
    [field: string]: {
      matches?: number;
      ngroups?: number;
      groups: Array<{
        groupValue: string;
        doclist: {
          numFound: number;
          start: number;
          docs: any[];
          maxScore?: number;
        };
      }>;
    };
  };
}
