import { sanitizeContentHtml } from './sanitize-content-html';

describe('sanitizeContentHtml', () => {
  it('removes colour declarations but keeps layout ones', () => {
    const out = sanitizeContentHtml(
      '<p style="margin: 0px 0px 1rem; color: rgb(38, 51, 64);">Text</p>'
    );
    expect(out).toContain('margin: 0px 0px 1rem');
    expect(out).not.toContain('color');
  });

  it('removes font-family and font-size but keeps font-weight', () => {
    const out = sanitizeContentHtml(
      '<p style="font-family: &quot;IBM Plex Sans&quot;, sans-serif; font-size: medium; font-weight: 400; margin: 0;">T</p>'
    );
    expect(out).not.toContain('font-family');
    expect(out).not.toContain('font-size');
    expect(out).toContain('font-weight: 400');
    expect(out).toContain('margin: 0');
  });

  it('drops the style attribute entirely when nothing survives', () => {
    const out = sanitizeContentHtml('<span style="color: rgb(38, 51, 64);">T</span>');
    expect(out).toBe('<span>T</span>');
  });

  it('keeps font-weight — it is semantic emphasis, not theming', () => {
    // Bold carries meaning ("Díla nedostupná na trhu") and is theme-agnostic,
    // so it must survive even though it is nominally a font property.
    const out = sanitizeContentHtml('<span style="font-weight: 600;">DNNT</span>');
    expect(out).toBe('<span style="font-weight: 600">DNNT</span>');
  });

  it('keeps font-style so italics survive', () => {
    const out = sanitizeContentHtml('<i style="font-style: italic; color: red;">Pokud máte dotazy</i>');
    expect(out).toContain('font-style: italic');
    expect(out).not.toContain('color');
  });

  it('removes background and border colours', () => {
    const out = sanitizeContentHtml(
      '<div style="background-color: #fff; border: 1px solid rgb(0,0,0); padding: 1rem;">T</div>'
    );
    expect(out).not.toContain('background-color');
    expect(out).not.toContain('border:');
    expect(out).toContain('padding: 1rem');
  });

  it('removes text-decoration colour hints but keeps text-underline-offset', () => {
    const out = sanitizeContentHtml(
      '<a href="x" style="color: rgb(0, 99, 204); text-underline-offset: 2px;">L</a>'
    );
    expect(out).not.toContain('color');
    expect(out).toContain('text-underline-offset: 2px');
  });

  it('keeps list-style, text-align and padding-left', () => {
    const out = sanitizeContentHtml(
      '<ul style="list-style: circle; padding-left: 1.25rem; text-align: left; color: rgb(38,51,64);">'
      + '<li>a</li></ul>'
    );
    expect(out).toContain('list-style: circle');
    expect(out).toContain('padding-left: 1.25rem');
    expect(out).toContain('text-align: left');
    expect(out).not.toContain('color: rgb');
  });

  it('leaves markup without any style attribute untouched', () => {
    const html = '<p>Plain <a href="https://x.cz">link</a></p>';
    expect(sanitizeContentHtml(html)).toBe(html);
  });

  it('preserves non-style attributes such as href, src and lang', () => {
    const out = sanitizeContentHtml(
      '<a href="https://sdnnt.nkp.cz" lang="cs" style="color: red;">Seznam</a>'
    );
    expect(out).toContain('href="https://sdnnt.nkp.cz"');
    expect(out).toContain('lang="cs"');
  });

  it('handles an empty string and undefined-ish input', () => {
    expect(sanitizeContentHtml('')).toBe('');
    expect(sanitizeContentHtml(null as unknown as string)).toBe('');
  });

  it('preserves Czech diacritics', () => {
    const out = sanitizeContentHtml('<p style="color: red;">Díla nedostupná na trhu</p>');
    expect(out).toContain('Díla nedostupná na trhu');
  });

  it('cleans the real-world DNNT page fragment', () => {
    const out = sanitizeContentHtml(`
      <p style="margin: 0px 0px 1rem; color: rgb(38, 51, 64); font-family: &quot;IBM Plex Sans&quot;, -apple-system, sans-serif; font-size: medium; font-weight: 400;">Přihlášení uživatelé</p>
      <ul style="list-style: circle; margin: 0px 0px 1rem; padding-left: 1.25rem; color: rgb(38, 51, 64); font-size: medium;">
        <li style="margin: 0.25rem 0px;">k volným dílům</li>
      </ul>`);
    expect(out).not.toContain('rgb(38, 51, 64)');
    expect(out).not.toContain('IBM Plex Sans');
    expect(out).not.toContain('font-size');
    expect(out).toContain('font-weight: 400');
    expect(out).toContain('list-style: circle');
    expect(out).toContain('margin: 0.25rem 0px');
    expect(out).toContain('Přihlášení uživatelé');
  });

  it('leaves non-style markup structurally intact', () => {
    // This helper only touches style attributes; it is not an XSS sanitiser.
    // The content is trusted local config already bound via bypassSecurityTrustHtml.
    const out = sanitizeContentHtml(
      '<div style="color: red;"><br><img src="/img/logo.svg" alt=""></div>'
    );
    expect(out).toContain('<br>');
    expect(out).toContain('<img src="/img/logo.svg" alt="">');
    expect(out).not.toContain('color');
  });
});
