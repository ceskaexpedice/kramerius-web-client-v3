import { parseSearchDocument } from '../../models/search-document';
import { DocumentTypeEnum } from '../../constants/document-type';

export interface ParsedResults {
  results: any[];
  totalCount: number;
}

function getHighlighting(resultsRes: any, pid: string): any {
  let highlighting = resultsRes.highlighting?.[pid];
  if (!highlighting || Object.keys(highlighting).length === 0) {
    const highlightingKey = Object.keys(resultsRes.highlighting || {}).find(key =>
      key.includes('!') && key.split('!')[1] === pid
    );
    highlighting = highlightingKey ? resultsRes.highlighting?.[highlightingKey] : {};
  }
  return highlighting || {};
}

function isPageDoc(d: any): boolean {
  return d.model === DocumentTypeEnum.page
    || (typeof d.own_model_path === 'string' && d.own_model_path.includes(DocumentTypeEnum.page));
}

export function parseSolrSearchResponse(resultsRes: any, submittedTerm?: string): ParsedResults {
  const groupedField = resultsRes.grouped?.['root.pid'];

  const buildParsed = (doc: any): any => {
    doc['highlighting'] = getHighlighting(resultsRes, doc.pid);
    const parsed: any = parseSearchDocument(doc);
    if (submittedTerm && submittedTerm.trim().length > 0) {
      parsed.fulltext = submittedTerm;
    }
    return parsed;
  };

  if (groupedField) {
    const parsedResults = (groupedField.groups ?? []).flatMap((group: any) => {
      const docs = group.doclist?.docs ?? [];
      if (docs.length === 0) return [];
      const numFound = group.doclist?.numFound ?? 0;
      const rootPid = group.groupValue;
      const out: any[] = [];

      // Page-level grouped representative: project onto root and attach occurrence count.
      const pageDoc = docs.find(isPageDoc);
      if (pageDoc) {
        const parsed = buildParsed(pageDoc);
        parsed.occurrenceCount = numFound;
        parsed.grouped = true;
        if (parsed.rootPid && parsed.rootModel) {
          parsed.pid = parsed.rootPid;
          parsed.title = parsed.rootTitle || parsed.title;
          parsed.model = parsed.rootModel;
          parsed.ownParentPid = undefined;
          parsed.ownParentModel = undefined;
        }
        out.push(parsed);
      }

      // Direct title hit (the root document itself matched on metadata):
      // emit as a separate result without count and without root-projection.
      const directHit = docs.find((d: any) => !isPageDoc(d) && d.pid === rootPid);
      if (directHit) {
        out.push(buildParsed(directHit));
      }

      return out;
    });

    return {
      results: parsedResults,
      totalCount: groupedField.ngroups ?? parsedResults.length,
    };
  }

  const parsedResults = (resultsRes.response?.docs ?? []).map((doc: any) => {
    doc['highlighting'] = getHighlighting(resultsRes, doc.pid);
    return parseSearchDocument(doc);
  });

  return {
    results: parsedResults,
    totalCount: resultsRes.response?.numFound ?? 0,
  };
}

export function getTotalCountFromResponse(resultsRes: any): number {
  const groupedField = resultsRes.grouped?.['root.pid'];
  return groupedField
    ? (groupedField.ngroups ?? 0)
    : (resultsRes.response?.numFound ?? 0);
}
