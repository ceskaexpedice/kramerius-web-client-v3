import { LicenseActionsConfig } from '../../../core/config/config.interfaces';
import { visibleMetadataTabs, MetadataTabScope } from './metadata-dialog-tabs';

/**
 * `metadata: true` opens the metadata dialog, but says nothing about the content
 * of each resource tab. ALTO/OCR serve the page's OCR text and IIIF is the route
 * to the full-resolution scan, so those tabs must follow `text` / `jpeg` — the
 * same actions that block copying the text and downloading the image elsewhere.
 */
describe('visibleMetadataTabs', () => {
  const allowAll = () => true;
  const deny = (...blocked: (keyof LicenseActionsConfig)[]) =>
    (action: keyof LicenseActionsConfig) => !blocked.includes(action);

  it('shows every tab when nothing is restricted', () => {
    expect(visibleMetadataTabs(allowAll)).toEqual(
      ['mods', 'dc', 'solr', 'foxml', 'alto', 'ocr', 'item', 'children', 'iiif'],
    );
  });

  it('hides the OCR-bearing tabs when text is forbidden', () => {
    const tabs = visibleMetadataTabs(deny('text'));
    expect(tabs).not.toContain('alto');
    expect(tabs).not.toContain('ocr');
    // FOXML is the raw object and ships the OCR datastreams with it.
    expect(tabs).not.toContain('foxml');
  });

  it('hides the IIIF tab when the image is forbidden', () => {
    expect(visibleMetadataTabs(deny('jpeg'))).not.toContain('iiif');
  });

  it('leaves only the descriptive tabs under a DNNTO-style license', () => {
    // dnnto: text false, jpeg false, metadata true.
    expect(visibleMetadataTabs(deny('text', 'jpeg')))
      .toEqual(['mods', 'dc', 'solr', 'item', 'children']);
  });

  it('never hides the descriptive tabs, which `metadata` alone governs', () => {
    // Denying every content action must not touch them.
    const tabs = visibleMetadataTabs(() => false);
    expect(tabs).toEqual(['mods', 'dc', 'solr', 'item', 'children']);
  });

  it('preserves the configured display order', () => {
    const tabs = visibleMetadataTabs(deny('text'));
    expect(tabs).toEqual(['mods', 'dc', 'solr', 'item', 'children', 'iiif']);
  });
});

/**
 * Scope, mirroring the page/document split the export panel draws: a page-scoped
 * tab may consult the runtime licence the backend is actually serving under,
 * while an ancestor's tabs reach pages the reader never opened and may not.
 */
describe('visibleMetadataTabs scope', () => {
  it('passes the scope through to the predicate', () => {
    const seen: MetadataTabScope[] = [];
    visibleMetadataTabs((_action, scope) => { seen.push(scope); return true; }, 'page');

    expect(seen.length).toBeGreaterThan(0);
    expect(new Set(seen)).toEqual(new Set<MetadataTabScope>(['page']));
  });

  it('defaults to document scope, preserving the previous behaviour', () => {
    const seen: MetadataTabScope[] = [];
    visibleMetadataTabs((_action, scope) => { seen.push(scope); return true; });

    expect(new Set(seen)).toEqual(new Set<MetadataTabScope>(['document']));
  });

  it('lets a page-scoped allow reveal the OCR tabs a document-scoped deny would hide', () => {
    // The dnnto case from the report: the document's Solr flags deny `text`, but
    // the page itself is being served as public.
    const isAllowed = (action: keyof LicenseActionsConfig, scope: MetadataTabScope) =>
      scope === 'page' ? true : action !== 'text' && action !== 'jpeg';

    expect(visibleMetadataTabs(isAllowed, 'page')).toContain('ocr');
    expect(visibleMetadataTabs(isAllowed, 'document')).not.toContain('ocr');
  });

  it('still hides the OCR tabs at page scope when the runtime licence denies text', () => {
    const isAllowed = (action: keyof LicenseActionsConfig) => action !== 'text';

    const tabs = visibleMetadataTabs(isAllowed, 'page');
    expect(tabs).not.toContain('ocr');
    expect(tabs).not.toContain('alto');
    expect(tabs).not.toContain('foxml');
  });
});
