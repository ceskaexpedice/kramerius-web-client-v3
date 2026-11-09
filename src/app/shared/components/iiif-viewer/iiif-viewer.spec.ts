import { IIIFViewer } from './iiif-viewer';

/**
 * Swipe page-turning on touch devices.
 *
 * A swipe turns the page only from a page edge that was in view when the drag
 * started, so a zoomed-in reader pans with a drag and turns the page by
 * dragging past the edge. It used to be gated on "zoom within 15% of home",
 * which killed swiping after any pinch and under zoom lock, and on a 600 ms
 * time limit, which ignored slower drags (mobile testing 2. 11., P1).
 * Issue #161 (fitted page in a tall or split viewer must swipe) still holds:
 * a fitted page shows both of its edges.
 */
describe('IIIFViewer swipe', () => {

  const WIDTH = 390;

  type Rect = { x: number; y: number; width: number; height: number };

  function makeComponent(view: Rect, page: Rect = { x: 0, y: 0, width: 1, height: 1.4 }) {
    const component = Object.create(IIIFViewer.prototype) as IIIFViewer;
    const navigations: string[] = [];
    let selectionMode = false;
    let now = 0;

    (component as any).SWIPE_CONFIG = {
      minDistanceRatio: 0.25, flickDistance: 50, flickVelocity: 0.3,
      maxVerticalRatio: 0.5, edgeTolerance: 0.01
    };
    (component as any).touchState = {
      startX: 0, startY: 0, startTime: 0, tracking: false, maxTouches: 0,
      edges: { left: false, right: false }
    };
    (component as any).viewer = {
      viewport: { getBounds: () => view },
      world: { getHomeBounds: () => page },
    };
    (component as any).viewerContainer = { nativeElement: { clientWidth: WIDTH } };
    (component as any).iiifViewerService = { inSelectionMode: () => selectionMode };
    (component as any).navigateBySwipe = (dir: string) => navigations.push(dir);
    spyOn(Date, 'now').and.callFake(() => now);

    const touch = (x: number, y = 400) => ({ clientX: x, clientY: y });
    const c = component as any;
    return {
      navigations,
      setView: (v: Rect) => { view = v; },
      setSelectionMode: (on: boolean) => { selectionMode = on; },
      /** One finger from x0 to x1 over `ms` milliseconds. */
      drag(x0: number, x1: number, ms: number, y1 = 400, duringDrag?: () => void) {
        now = 0;
        c.handleTouchStart({ touches: [touch(x0)] });
        duringDrag?.();
        c.handleTouchMove({ touches: [touch(x1, y1)] });
        now = ms;
        c.handleTouchEnd({ touches: [], changedTouches: [touch(x1, y1)], preventDefault: () => {} });
      },
      /** Pinch with two fingers, then lift one and drag the other. */
      pinchThenDrag(x0: number, x1: number) {
        now = 0;
        c.handleTouchStart({ touches: [touch(x0)] });
        c.handleTouchStart({ touches: [touch(x0), touch(x0 - 100)] });
        c.handleTouchMove({ touches: [touch(x0), touch(x0 - 150)] });
        c.handleTouchEnd({ touches: [touch(x0)], changedTouches: [touch(x0 - 150)], preventDefault: () => {} });
        c.handleTouchMove({ touches: [touch(x1)] });
        now = 200;
        c.handleTouchEnd({ touches: [], changedTouches: [touch(x1)], preventDefault: () => {} });
      },
    };
  }

  const FITTED: Rect = { x: 0, y: -0.2, width: 1, height: 1.75 };

  it('turns the page on a quick swipe at the fitted view', () => {
    const t = makeComponent(FITTED);
    t.drag(300, 100, 200);
    expect(t.navigations).toEqual(['left']);
    t.drag(100, 300, 200);
    expect(t.navigations).toEqual(['left', 'right']);
  });

  it('turns the page on a slow but long drag (no time limit)', () => {
    const t = makeComponent(FITTED);
    t.drag(300, 100, 1500);
    expect(t.navigations).toEqual(['left']);
  });

  it('ignores a short slow drag', () => {
    const t = makeComponent(FITTED);
    t.drag(300, 240, 1000);
    expect(t.navigations).toEqual([]);
  });

  it('ignores a mostly vertical drag', () => {
    const t = makeComponent(FITTED);
    t.drag(300, 150, 200, 700);
    expect(t.navigations).toEqual([]);
  });

  it('pans, not turns, when zoomed in mid-page', () => {
    // Zoomed 2.5x on the middle of the page: neither edge in view.
    const t = makeComponent({ x: 0.3, y: 0.3, width: 0.4, height: 0.7 });
    t.drag(300, 100, 200);
    t.drag(100, 300, 200);
    expect(t.navigations).toEqual([]);
  });

  it('turns to the next page when zoomed in with the right edge in view', () => {
    const t = makeComponent({ x: 0.6, y: 0.3, width: 0.4, height: 0.7 });
    t.drag(300, 100, 200);
    expect(t.navigations).toEqual(['left']);
    // ...but not back: the left edge is out of view.
    t.drag(100, 300, 200);
    expect(t.navigations).toEqual(['left']);
  });

  it('turns to the previous page when zoomed in with the left edge in view', () => {
    const t = makeComponent({ x: 0, y: 0.3, width: 0.4, height: 0.7 });
    t.drag(100, 300, 200);
    expect(t.navigations).toEqual(['right']);
  });

  it('judges the edges where the drag started, not where it panned to', () => {
    const t = makeComponent({ x: 0.3, y: 0.3, width: 0.4, height: 0.7 });
    // The drag itself pans the right edge into view; it must still not turn the page.
    t.drag(300, 100, 200, 400, () => t.setView({ x: 0.6, y: 0.3, width: 0.4, height: 0.7 }));
    expect(t.navigations).toEqual([]);
  });

  it('treats a page narrower than the viewer (landscape) as fully in view', () => {
    const t = makeComponent({ x: -0.5, y: 0, width: 2, height: 1.4 });
    t.drag(300, 100, 200);
    expect(t.navigations).toEqual(['left']);
  });

  it('never turns the page from a pinch, not even its one-finger tail', () => {
    const t = makeComponent(FITTED);
    t.pinchThenDrag(300, 50);
    expect(t.navigations).toEqual([]);
    // The next ordinary swipe works again.
    t.drag(300, 100, 200);
    expect(t.navigations).toEqual(['left']);
  });

  it('does not turn the page while an area is being selected', () => {
    const t = makeComponent(FITTED);
    t.setSelectionMode(true);
    t.drag(300, 100, 200);
    expect(t.navigations).toEqual([]);
  });

});

/**
 * Regression tests for the licensed-JPEG blank viewer.
 *
 * Every JPEG page 404s on IIIF info.json and falls back to the direct image.
 * That fallback used to be handed to OpenSeadragon as `{type:'image', url}`,
 * which ImageTileSource loads with `image.src = url` — a plain <img> request
 * that cannot carry the viewer's ajaxHeaders. Licensed pages (e.g. dnnto)
 * therefore hit the API anonymously and got 403 even for a signed-in user.
 * The image is now fetched via HttpClient (token attached) and handed over as
 * a blob object URL.
 */
describe('IIIFViewer direct-image fallback', () => {

  const PID = 'uuid:071b2770-e06e-11e1-9570-000d606f5dc6';

  function makeComponent(opts: {
    token?: string;
    respond: (observer: { next: (b: any) => void; error: (e: any) => void }) => void;
  }) {
    const component = Object.create(IIIFViewer.prototype) as IIIFViewer;
    const requests: { url: string; headers: any }[] = [];

    (component as any).imagePid = PID;
    (component as any).metadata = null;
    (component as any).viewer = { open: jasmine.createSpy('open') };
    (component as any).ngZone = { run: (fn: () => void) => fn() };
    (component as any).cdr = { detectChanges: () => {} };
    (component as any).directImageFailedPids = new Set<string>();
    (component as any).failedPids = new Set<string>();
    (component as any).showFallback = signalStub(false);
    (component as any).fallbackImageUrl = signalStub<string | null>(null);
    (component as any).accessDenied = signalStub(false);
    (component as any).fallbackNotice = signalStub<string | null>(null);
    (component as any).fallbackNoticeDismissed = signalStub(false);
    (component as any).fallbackObjectUrl = null;

    (component as any).iiifViewerService = {
      getDirectImageUrl: (pid: string) => `https://api.test/items/${pid}/image`,
      getThumbnailUrl: (pid: string) => `https://api.test/items/${pid}/image/thumb`,
      getAuthHeaders: () => (opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
    };

    (component as any).http = {
      get: (url: string, options: any) => {
        requests.push({ url, headers: options.headers });
        return { subscribe: (observer: any) => opts.respond(observer) };
      }
    };

    return { component, requests };
  }

  /** Minimal stand-in for an Angular signal. */
  function signalStub<T>(initial: T) {
    let value = initial;
    const fn: any = () => value;
    fn.set = (v: T) => { value = v; };
    return fn;
  }

  it('sends the Authorization header when fetching the direct image', () => {
    const { component, requests } = makeComponent({
      token: 'abc123',
      respond: () => {}
    });

    (component as any).loadDirectImageFallback(PID);

    expect(requests.length).toBe(1);
    expect(requests[0].url).toBe(`https://api.test/items/${PID}/image`);
    // This is the whole point of the fix: a plain <img> could never do this.
    expect(requests[0].headers.get('Authorization')).toBe('Bearer abc123');
  });

  it('opens the viewer with a blob object URL, not the API URL', () => {
    const blob = new Blob(['jpeg-bytes'], { type: 'image/jpeg' });
    const { component } = makeComponent({
      token: 'abc123',
      respond: (o) => o.next(blob)
    });

    (component as any).loadDirectImageFallback(PID);

    const open = (component as any).viewer.open as jasmine.Spy;
    expect(open).toHaveBeenCalled();
    const tileSource = open.calls.mostRecent().args[0].tileSource;
    expect(tileSource.type).toBe('image');
    expect(tileSource.url.startsWith('blob:')).toBe(true);

    URL.revokeObjectURL(tileSource.url);
  });

  it('flags a 403 as access denied rather than a broken image', () => {
    const { component } = makeComponent({
      respond: (o) => o.error({ status: 403 })
    });

    (component as any).loadDirectImageFallback(PID);

    expect((component as any).accessDenied()).toBe(true);
    expect((component as any).showFallback()).toBe(true);
    // The fallback <img> has no auth either, so it must use the thumbnail,
    // which stays readable, instead of the full image that just 403'd.
    expect((component as any).fallbackImageUrl()).toBe(`https://api.test/items/${PID}/image/thumb`);
  });

  it('explains a 403 fallback as missing permission', () => {
    const { component } = makeComponent({
      respond: (o) => o.error({ status: 403 })
    });

    (component as any).loadDirectImageFallback(PID);

    expect((component as any).fallbackNotice()).toBe('forbidden');
  });

  it('explains any other failure as the image being unavailable', () => {
    const { component } = makeComponent({
      respond: (o) => o.error({ status: 404 })
    });

    (component as any).loadDirectImageFallback(PID);

    expect((component as any).fallbackNotice()).toBe('unavailable');
  });

  it('keeps the notice across a page change, so a library that is down does not flash it per page', () => {
    const { component } = makeComponent({ respond: () => {} });
    (component as any).fallbackNotice.set('unavailable');
    (component as any).triggerViewerUpdate = () => {};

    component.ngOnChanges({ imagePid: { firstChange: false } as any });

    expect((component as any).fallbackNotice()).toBe('unavailable');
    expect((component as any).showFallback()).toBe(false);
  });

  it('keeps a dismissed notice hidden across a page change', () => {
    const { component } = makeComponent({ respond: (o) => o.error({ status: 404 }) });
    (component as any).triggerViewerUpdate = () => {};
    component.dismissFallbackNotice();

    component.ngOnChanges({ imagePid: { firstChange: false } as any });
    (component as any).loadDirectImageFallback(PID);

    expect((component as any).fallbackNotice()).toBe('unavailable');
    expect((component as any).fallbackNoticeDismissed()).toBe(true);
  });

  it('retry clears the fallback and loads the page again', () => {
    const { component } = makeComponent({ respond: () => {} });
    (component as any).fallbackNotice.set('unavailable');
    (component as any).showFallback.set(true);
    (component as any).failedPids.add(PID);
    (component as any).directImageFailedPids.add(PID);
    const update = jasmine.createSpy('triggerViewerUpdate');
    (component as any).triggerViewerUpdate = update;

    component.retryImage();

    expect((component as any).fallbackNotice()).toBeNull();
    expect((component as any).showFallback()).toBe(false);
    expect((component as any).failedPids.has(PID)).toBe(false);
    expect((component as any).directImageFailedPids.has(PID)).toBe(false);
    expect(update).toHaveBeenCalled();
  });

  it('does not flag a network failure as access denied', () => {
    const { component } = makeComponent({
      respond: (o) => o.error({ status: 500 })
    });

    (component as any).loadDirectImageFallback(PID);

    expect((component as any).accessDenied()).toBe(false);
    expect((component as any).showFallback()).toBe(true);
  });

  it('ignores a response that arrives after the user navigated away', () => {
    let deferred: any = null;
    const { component } = makeComponent({
      respond: (o) => { deferred = o; }
    });

    (component as any).loadDirectImageFallback(PID);
    // User turns the page before the image comes back.
    (component as any).imagePid = 'uuid:some-other-page';
    deferred.next(new Blob(['late'], { type: 'image/jpeg' }));

    expect((component as any).viewer.open).not.toHaveBeenCalled();
  });

  it('revokes the previous blob before installing the next one', () => {
    const revoke = spyOn(URL, 'revokeObjectURL').and.callThrough();
    const { component } = makeComponent({
      respond: (o) => o.next(new Blob(['x'], { type: 'image/jpeg' }))
    });

    (component as any).loadDirectImageFallback(PID);
    const first = (component as any).fallbackObjectUrl;
    (component as any).loadDirectImageFallback(PID);

    expect(revoke).toHaveBeenCalledWith(first);
    URL.revokeObjectURL((component as any).fallbackObjectUrl);
  });

});

/**
 * Regression tests for shared crop ("vystrizek") links: /uuid/<pid>?bb=x,y,w,h
 *
 * Opens the crop like the legacy client (#187): zoom so the crop fills the
 * viewer AND mark it as the selection. Zoom alone (7f3d9599) left no clue which
 * part was selected; selection alone showed the whole page. Anchored on the
 * viewer `open` event so the crop doesn't wait for the full page to load.
 */
describe('IIIFViewer bb crop links', () => {

  function makeComponent(bb: string | null) {
    const component = Object.create(IIIFViewer.prototype) as IIIFViewer;

    const zoomCalls: { x: number; y: number; width: number; height: number }[] = [];
    const selectionCalls: any[] = [];
    const navigations: any[] = [];

    (component as any).iiifViewerService = {
      zoomToImageRegion: (rect: any) => zoomCalls.push({
        x: rect.x, y: rect.y, width: rect.width, height: rect.height,
      }),
      setSelection: (rect: any) => selectionCalls.push(rect),
    };
    (component as any).route = {
      snapshot: { queryParamMap: { get: (key: string) => (key === 'bb' ? bb : null) } },
    };
    (component as any).router = {
      navigate: (commands: any, extras: any) => navigations.push(extras),
    };

    return { component, zoomCalls, selectionCalls, navigations };
  }

  function apply(bb: string | null) {
    const ctx = makeComponent(bb);
    (ctx.component as any).applyBoundingBoxFromUrl();
    return ctx;
  }

  it('zooms the viewport to the bb region', () => {
    // The reported URL: ?bb=340,1209,456,449
    const { zoomCalls } = apply('340,1209,456,449');

    expect(zoomCalls.length).toBe(1);
    expect(zoomCalls[0]).toEqual({ x: 340, y: 1209, width: 456, height: 449 });
  });

  it('marks the bb region as the selection, after zooming', () => {
    const ctx = makeComponent('340,1209,456,449');
    const order: string[] = [];
    const service = (ctx.component as any).iiifViewerService;
    const zoom = service.zoomToImageRegion;
    const select = service.setSelection;
    service.zoomToImageRegion = (r: any) => { order.push('zoom'); zoom(r); };
    service.setSelection = (r: any) => { order.push('select'); select(r); };

    (ctx.component as any).applyBoundingBoxFromUrl();

    expect(ctx.selectionCalls.length).toBe(1);
    const sel = ctx.selectionCalls[0];
    expect({ x: sel.x, y: sel.y, width: sel.width, height: sel.height })
      .toEqual({ x: 340, y: 1209, width: 456, height: 449 });
    expect(order).toEqual(['zoom', 'select']);
  });

  it('strips the bb param once applied', () => {
    const { navigations } = apply('340,1209,456,449');

    expect(navigations.length).toBe(1);
    expect(navigations[0].queryParams).toEqual({ bb: null });
    expect(navigations[0].replaceUrl).toBe(true);
    expect(navigations[0].queryParamsHandling).toBe('merge');
  });

  it('does nothing when no bb param is present', () => {
    const { zoomCalls, selectionCalls, navigations } = apply(null);

    expect(zoomCalls.length).toBe(0);
    expect(selectionCalls.length).toBe(0);
    expect(navigations.length).toBe(0);
  });

  it('ignores a malformed bb param', () => {
    // Wrong arity, non-numeric, and empty values must not reach the viewport.
    for (const bad of ['340,1209,456', '340,1209,456,449,7', 'a,b,c,d', '', '340,,456,449']) {
      const { zoomCalls, selectionCalls, navigations } = apply(bad);
      expect(zoomCalls.length).withContext(bad).toBe(0);
      expect(selectionCalls.length).withContext(bad).toBe(0);
      expect(navigations.length).withContext(bad).toBe(0);
    }
  });

  it('ignores a zero- or negative-area bb param', () => {
    // fitBounds on an empty rect zooms to infinity and blanks the viewer.
    for (const bad of ['340,1209,0,449', '340,1209,456,0', '340,1209,-5,449']) {
      const { zoomCalls } = apply(bad);
      expect(zoomCalls.length).withContext(bad).toBe(0);
    }
  });

  it('accepts fractional coordinates', () => {
    const { zoomCalls } = apply('340.5,1209.25,456.75,449.5');

    expect(zoomCalls[0]).toEqual({ x: 340.5, y: 1209.25, width: 456.75, height: 449.5 });
  });

});

/**
 * Tile requests each pay the CDK proxy's per-request overhead, and servers
 * advertise 256px tiles — a 1448×2180 page at fit-to-screen cost ~80 requests.
 * processInfoJson enlarges the advertised tile so the same pixels arrive in far
 * fewer requests, but only where the server can serve arbitrary regions.
 */
describe('IIIFViewer.processInfoJson tile size', () => {
  const INFO_URL = 'https://api.test/search/iiif/mzk/uuid:page/info.json';

  function process(infoJson: any): any {
    const component = Object.create(IIIFViewer.prototype) as IIIFViewer;
    (component as any).processInfoJson(infoJson, INFO_URL);
    return infoJson;
  }

  function v3Info(profile: any, extra: any = {}): any {
    return {
      '@context': 'http://iiif.io/api/image/3/context.json',
      id: 'http://imageserver_backend/page',
      type: 'ImageService3',
      protocol: 'http://iiif.io/api/image',
      profile,
      width: 1448,
      height: 2180,
      tiles: [{ width: 256, height: 256, scaleFactors: [1, 2, 4, 8, 16] }],
      ...extra,
    };
  }

  it('enlarges the advertised tile on a level2 server, keeping its scale factors', () => {
    const info = process(v3Info('level2'));
    expect(info.tiles).toEqual([{ width: 512, height: 512, scaleFactors: [1, 2, 4, 8, 16] }]);
  });

  it('enlarges every tile entry when the server lists several', () => {
    const info = process(v3Info('level1', {
      tiles: [
        { width: 256, scaleFactors: [1, 2] },
        { width: 128, scaleFactors: [4, 8] },
      ],
    }));
    expect(info.tiles.map((t: any) => [t.width, t.height])).toEqual([[512, 512], [512, 512]]);
  });

  it('enlarges tiles on an IIIF 2 level2 profile given as an array', () => {
    const info = process(v3Info(['http://iiif.io/api/image/2/level2.json', { supports: ['sizeByW'] }]));
    expect(info.tiles[0].width).toBe(512);
  });

  it('leaves a tile already at least the target size alone', () => {
    const info = process(v3Info('level2', { tiles: [{ width: 2048, height: 2048, scaleFactors: [1, 2] }] }));
    expect(info.tiles[0].width).toBe(2048);
  });

  it('leaves tiles alone on a level0 server, which can only serve its precomputed tiles', () => {
    const info = process(v3Info('level0'));
    expect(info.tiles[0].width).toBe(256);
  });

  it('leaves tiles alone on an IIIF 2 level0 profile', () => {
    const info = process(v3Info(['http://iiif.io/api/image/2/level0.json']));
    expect(info.tiles[0].width).toBe(256);
  });
});
