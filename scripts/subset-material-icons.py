#!/usr/bin/env python3
"""
Builds the self-hosted Material Icons subset used by the client.

The app only uses a handful of Material Icons (accessibility symbols on every
record card and in the facets, plus `search_off`), rendered by ligature:
`<i class="material-icons">visibility</i>`. Loading the whole font from Google
cost ~128 kB on every page with record cards; the subset is ~1–2 kB.

Icons are listed in public/fonts/material-icons/icons.json (a unit test checks
that every icon the code uses is listed). After adding an icon there, re-run:

    python3 -m venv /tmp/fontvenv && /tmp/fontvenv/bin/pip install fonttools brotli
    /tmp/fontvenv/bin/python scripts/subset-material-icons.py

Optionally pass a path to an already downloaded MaterialIcons font
(woff2/woff/ttf) instead of fetching it from Google Fonts.

The subset keeps only the requested ligatures: GSUB closure is disabled,
otherwise the letters a–z would pull in (almost) every icon of the font.
"""
import json
import sys
import tempfile
import urllib.request
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parent.parent
FONT_DIR = ROOT / 'public' / 'fonts' / 'material-icons'
ICONS_FILE = FONT_DIR / 'icons.json'
OUTPUT = FONT_DIR / 'material-icons-subset.woff2'

GOOGLE_CSS = 'https://fonts.googleapis.com/icon?family=Material+Icons'
# A modern UA so Google serves the woff2 variant.
USER_AGENT = ('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 '
              '(KHTML, like Gecko) Chrome/130.0 Safari/537.36')


def fetch(url: str) -> bytes:
    req = urllib.request.Request(url, headers={'User-Agent': USER_AGENT})
    with urllib.request.urlopen(req) as res:
        return res.read()


def download_source_font() -> Path:
    css = fetch(GOOGLE_CSS).decode('utf-8')
    start = css.index('url(') + 4
    font_url = css[start:css.index(')', start)]
    path = Path(tempfile.mkdtemp()) / 'MaterialIcons.woff2'
    path.write_bytes(fetch(font_url))
    print(f'[subset-material-icons] downloaded {font_url}')
    return path


def ligatures(font: TTFont) -> dict:
    """(component glyphs…) → ligature glyph, for every ligature in GSUB."""
    found = {}
    for lookup in font['GSUB'].table.LookupList.Lookup:
        for st in lookup.SubTable:
            if st.LookupType == 7:  # extension
                st = st.ExtSubTable
            for first, ligs in getattr(st, 'ligatures', {}).items():
                for lig in ligs:
                    found[tuple([first] + lig.Component)] = lig.LigGlyph
    return found


def ligature_glyph(font: TTFont, name: str, ligs: dict) -> str:
    cmap = font.getBestCmap()
    key = tuple(cmap[ord(ch)] for ch in name)
    if key not in ligs:
        sys.exit(f'[subset-material-icons] ❌ "{name}" is not a Material Icons ligature')
    return ligs[key]


def main() -> None:
    icons = json.loads(ICONS_FILE.read_text())
    source = Path(sys.argv[1]) if len(sys.argv) > 1 else download_source_font()

    font = TTFont(source)
    ligs = ligatures(font)
    glyphs = [ligature_glyph(font, name, ligs) for name in icons]

    options = subset.Options()
    options.layout_features = ['liga', 'rlig', 'calt', 'ccmp']
    options.layout_closure = False
    options.notdef_outline = True
    options.flavor = 'woff2'

    subsetter = subset.Subsetter(options=options)
    subsetter.populate(text=''.join(sorted(set(''.join(icons)))), glyphs=glyphs)
    subsetter.subset(font)
    font.flavor = 'woff2'
    font.save(OUTPUT)

    # Verify every requested icon still resolves through its ligature.
    out = TTFont(OUTPUT)
    kept = ligatures(out)
    for name in icons:
        ligature_glyph(out, name, kept)
    print(f'[subset-material-icons] ✅ {len(icons)} icons → '
          f'{OUTPUT.relative_to(ROOT)} ({OUTPUT.stat().st_size} B)')


if __name__ == '__main__':
    main()
