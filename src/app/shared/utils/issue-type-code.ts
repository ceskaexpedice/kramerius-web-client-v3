export function normalizeIssueTypeCode(code: unknown): string | undefined {
  return code === 'morning' || code === 'evening' ? code : undefined;
}
