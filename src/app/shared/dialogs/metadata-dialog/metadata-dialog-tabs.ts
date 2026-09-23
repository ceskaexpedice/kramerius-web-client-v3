import { LicenseActionsConfig } from '../../../core/config/config.interfaces';

/**
 * SCOPE — which licences answer for a tab, mirroring the page/document split the
 * export panel draws (see `DetailViewService.isActionAllowed` vs
 * `isDocumentActionAllowed`).
 *
 * Every tab here fetches for the pid the hierarchy selector has selected, so the
 * scope follows that selection rather than the tab id:
 *
 *  - `page` — the reader picked a page, and the tab serves that one page. The
 *    runtime `providedByLicenses` applies: it is the backend's own answer to
 *    "under which licence am I serving this page", and a page served as `public`
 *    must not have its OCR hidden by a `dnnto` flag the backend itself ignored.
 *  - `document` — the reader picked an ancestor (issue, volume, title). Its
 *    `children` / `foxml` reach pages that were never opened, so the open page's
 *    runtime licence must not unlock them. Static licences only.
 */
export type MetadataTabScope = 'page' | 'document';

/**
 * The metadata dialog's resource tabs, in display order, with the license action
 * each one depends on.
 *
 * `metadata: true` (which DNNTO grants) opens the dialog, but it says nothing
 * about the *content* behind each tab — and several of these tabs serve exactly
 * what other actions forbid:
 *
 *  - `alto` / `ocr` fetch /ocr/alto and /ocr/text, i.e. the page's OCR text that
 *    `text: false` keeps out of reach everywhere else. Here it would arrive as
 *    selectable, copyable `<pre>` text.
 *  - `foxml` is the raw Fedora object and carries the OCR datastreams with it,
 *    so it follows `text` too.
 *  - `iiif` is the image info/manifest — the route to the full-resolution scan —
 *    so it follows `jpeg`.
 *
 * The descriptive tabs (mods, dc, solr, item, children) are metadata proper and
 * stay governed by `metadata` alone.
 */
export const METADATA_DIALOG_TABS: readonly { id: string; requires?: keyof LicenseActionsConfig }[] = [
  { id: 'mods' },
  { id: 'dc' },
  { id: 'solr' },
  { id: 'foxml', requires: 'text' },
  { id: 'alto', requires: 'text' },
  { id: 'ocr', requires: 'text' },
  { id: 'item' },
  { id: 'children' },
  { id: 'iiif', requires: 'jpeg' },
];

/**
 * The tabs a document may show, given a predicate answering whether an action is
 * permitted for it. Kept as a free function so the policy can be tested without
 * constructing the dialog.
 *
 * `isAllowed` is handed the scope alongside the action so the caller can route
 * page-scoped lookups through the runtime licence and document-scoped ones
 * through the static licences. A caller that ignores the second argument keeps
 * the previous single-scope behaviour.
 */
export function visibleMetadataTabs(
  isAllowed: (action: keyof LicenseActionsConfig, scope: MetadataTabScope) => boolean,
  scope: MetadataTabScope = 'document',
): string[] {
  return METADATA_DIALOG_TABS
    .filter(tab => !tab.requires || isAllowed(tab.requires, scope))
    .map(tab => tab.id);
}
