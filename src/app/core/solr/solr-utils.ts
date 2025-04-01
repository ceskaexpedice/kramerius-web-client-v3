export class SolrUtils {
  static escapeTerm(term: string): string {
    return term.replace(/([+\-!():^\[\]"{}~*?|&])/g, '\\$1');
  }

  static cleanText(text: string): string {
    return text?.trim().replace(/\s+/g, ' ') || '';
  }
}
