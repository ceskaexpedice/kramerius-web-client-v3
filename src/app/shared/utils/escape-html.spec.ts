import { escapeHtml } from './escape-html';

describe('escapeHtml', () => {
  it('escapes all HTML special characters', () => {
    expect(escapeHtml(`<a href="x">&'`)).toBe('&lt;a href=&quot;x&quot;&gt;&amp;&#39;');
  });

  it('escapes ampersands first so entities are not double-formed', () => {
    expect(escapeHtml('&lt;')).toBe('&amp;lt;');
  });

  it('neutralises a script tag', () => {
    expect(escapeHtml('<script>alert(1)</script>'))
      .toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
  });

  it('leaves plain text untouched', () => {
    expect(escapeHtml('Díla nedostupná na trhu')).toBe('Díla nedostupná na trhu');
  });

  it('handles an empty string', () => {
    expect(escapeHtml('')).toBe('');
  });
});
