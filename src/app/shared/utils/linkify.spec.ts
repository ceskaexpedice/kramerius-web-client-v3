import { linkifyText } from './linkify';

describe('linkifyText', () => {
  it('links a bare https URL and leaves the trailing period out of it', () => {
    expect(linkifyText('Info na webu https://dnnt.cz. Dalsi text')).toBe(
      'Info na webu <a href="https://dnnt.cz" target="_blank" rel="noopener noreferrer">https://dnnt.cz</a>. Dalsi text'
    );
  });

  it('links www-prefixed hosts with an https scheme', () => {
    expect(linkifyText('viz www.knihovny.cz')).toBe(
      'viz <a href="https://www.knihovny.cz" target="_blank" rel="noopener noreferrer">www.knihovny.cz</a>'
    );
  });

  it('links e-mail addresses via mailto and keeps them in the same tab', () => {
    expect(linkifyText('napiste na digitalniknihovna@mzk.cz')).toBe(
      'napiste na <a href="mailto:digitalniknihovna@mzk.cz">digitalniknihovna@mzk.cz</a>'
    );
  });

  it('links every occurrence', () => {
    const result = linkifyText('https://a.cz a https://b.cz');
    expect(result.match(/<a /g)?.length).toBe(2);
  });

  it('escapes markup in the surrounding text', () => {
    expect(linkifyText('<b>x</b> & https://a.cz')).toBe(
      '&lt;b&gt;x&lt;/b&gt; &amp; <a href="https://a.cz" target="_blank" rel="noopener noreferrer">https://a.cz</a>'
    );
  });

  it('returns escaped text unchanged when there is no link', () => {
    expect(linkifyText('plain "text"')).toBe('plain &quot;text&quot;');
  });
});
