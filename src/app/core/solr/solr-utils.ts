export class SolrUtils {
  static escapeTerm(term: string): string {
    return term.replace(/([+\-!():^\[\]"{}~*?|&])/g, '\\$1');
  }

  static cleanText(text: string): string {
    return text?.trim().replace(/\s+/g, ' ') || '';
  }

  static escapeSolrValue(value: string): string {
    return value.replace(/(["\\])/g, '\\$1');
  }

  static removeBrackets(text: string): string {
    return text.replace(/[()]/g, '');
  }
}
