// highlight.js core with only the languages the app highlights.
// Importing 'highlight.js' pulls every bundled language (~1 MB raw, ~310 kB gzip),
// and the auth-data dialog sits on an eager import chain (SettingsService), so the
// full build used to land in the initial bundle.
//   xml       – MODS / DC / FOXML / ALTO (metadata dialog)
//   json      – Solr / item / children / IIIF (metadata dialog), auth data dialog
//   plaintext – 'language-text' fallback (aliases text, txt)
import hljs from 'highlight.js/lib/core';
import xml from 'highlight.js/lib/languages/xml';
import json from 'highlight.js/lib/languages/json';
import plaintext from 'highlight.js/lib/languages/plaintext';

hljs.registerLanguage('xml', xml);
hljs.registerLanguage('json', json);
hljs.registerLanguage('plaintext', plaintext);

export default hljs;
