/**
 * Regression tests for watermarked licenses.
 *
 * Two defects motivated these, both reported against `mzk_public-muo`
 * (Hudebniny Kroměříž):
 *
 *   1. The license was configured but carried no `watermark`, so the protective
 *      overlay the scans are licensed under never rendered in the viewer. The
 *      overlay is the condition under which MZK may publish these scans at all,
 *      so a missing one is a licensing problem, not a cosmetic one.
 *   2. Being `accessType: open`, the document was presented as a free work
 *      ("Volná díla") in the metadata sidebar — which contradicts the overlay
 *      drawn over the very same page.
 *
 * The config half is asserted against the real shipped `config-licenses.json`
 * rather than a fixture: the bug was that the file itself lacked the entry, so a
 * fixture would have passed while production stayed broken.
 */

// Marks this file as a module: spec files share one global scope in the Karma
// bundle, so top-level declarations here would otherwise collide with
// same-named ones in other specs.
export {};

import { TestBed } from '@angular/core/testing';
import { ConfigService } from './config.service';
import { EnvironmentService } from '../../shared/services/environment.service';
import { LicenseConfig } from './config.interfaces';

const CONFIG_FILE = '/local-config/config-licenses.json';
const WATERMARKED_LICENSE = 'mzk_public-muo';

async function loadLicenses(): Promise<LicenseConfig[]> {
  const res = await fetch(CONFIG_FILE);
  if (!res.ok) throw new Error(`${CONFIG_FILE} -> HTTP ${res.status}`);
  return (await res.json()).licenses;
}

describe('config-licenses.json watermarks', () => {
  it(`declares an image watermark for ${WATERMARKED_LICENSE}`, async () => {
    const licenses = await loadLicenses();
    const muo = licenses.find(l => l.id === WATERMARKED_LICENSE);

    expect(muo).withContext(`${WATERMARKED_LICENSE} missing from config`).toBeDefined();
    expect(muo!.watermark).withContext('watermark not configured').toBeDefined();
    expect(muo!.watermark!.type).toBe('image');
    expect(muo!.watermark!.logo).toBeTruthy();
  });

  it('points every watermark logo at a file that exists', async () => {
    // A broken path fails silently: the <img> onload never fires and the canvas
    // is simply left blank, which looks identical to "no watermark configured".
    const licenses = await loadLicenses();
    const logos = licenses
      .filter(l => l.watermark?.type === 'image')
      .map(l => ({ id: l.id, logo: l.watermark!.logo! }));

    expect(logos.length).toBeGreaterThan(0);

    for (const { id, logo } of logos) {
      const res = await fetch(logo);
      expect(res.ok).withContext(`${id}: ${logo} -> HTTP ${res.status}`).toBe(true);
    }
  });
});

describe('ConfigService.getWatermarkConfig', () => {
  let service: ConfigService;

  function seedLicenses(licenses: unknown[]): void {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [ConfigService, { provide: EnvironmentService, useValue: {} }],
    });
    service = TestBed.inject(ConfigService);
    (service as any).config$.next({ ...service.getConfig(), licenses });
  }

  const watermarked = {
    id: 'mzk_public-muo',
    accessType: 'open',
    label: { cs: 'Hudebniny Kroměříž' },
    watermark: { type: 'image', logo: '/img/logo/licenses/muo.png' },
  };
  const plain = { id: 'public', accessType: 'open', label: { cs: 'Volná díla' } };

  it('returns the watermark of a matching license', () => {
    seedLicenses([plain, watermarked]);
    expect(service.getWatermarkConfig(['mzk_public-muo'])?.logo).toBe('/img/logo/licenses/muo.png');
  });

  it('returns null when no document license carries a watermark', () => {
    seedLicenses([plain, watermarked]);
    expect(service.getWatermarkConfig(['public'])).toBeNull();
  });

  it('finds the watermark even when a plain license is listed first', () => {
    // Documents routinely carry several licenses; `licenses.facet` for the
    // reported record held `public` alongside the watermarked one, and the
    // overlay must not depend on their order.
    seedLicenses([plain, watermarked]);
    expect(service.getWatermarkConfig(['public', 'mzk_public-muo'])).not.toBeNull();
  });

  it('returns null for an empty license list', () => {
    seedLicenses([plain, watermarked]);
    expect(service.getWatermarkConfig([])).toBeNull();
  });
});

describe('watermark rotation config', () => {
  /**
   * The canvas renderer used to apply `ctx.rotate(-Math.PI / 4)` unconditionally, so
   * every watermark was locked to the 45° diagonal. That angle suits a tiled
   * anti-copy text watermark but not a single full-page logo, which must read
   * straight. Rotation is now opt-in per license, defaulting to upright.
   */
  it('leaves rotation unset for the muo overlay so it renders upright', async () => {
    const licenses = await loadLicenses();
    const muo = licenses.find(l => l.id === WATERMARKED_LICENSE);
    expect(muo!.watermark!.rotation ?? 0).toBe(0);
  });

  it('keeps every configured rotation a finite number of degrees', async () => {
    const licenses = await loadLicenses();
    for (const l of licenses.filter(x => x.watermark?.rotation !== undefined)) {
      const deg = l.watermark!.rotation!;
      expect(Number.isFinite(deg)).withContext(`${l.id}: rotation must be numeric`).toBe(true);
    }
  });
});
