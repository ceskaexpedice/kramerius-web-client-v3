import { PlatformLocation } from '@angular/common';
import { MockPlatformLocation } from '@angular/common/testing';
import { effect, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Event as RouterEvent, NavigationEnd, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { UiStateService } from '../../services/ui-state.service';
import { FixedPanelRef, FixedPanelService } from './fixed-panel.service';

describe('FixedPanelService', () => {
  let service: FixedPanelService;
  let uiState: UiStateService;
  let appended: HTMLElement[];
  let unregisters: (() => void)[];
  let pushed: FixedPanelRef[];

  const append = (el: HTMLElement, parent: HTMLElement = document.body): HTMLElement => {
    parent.appendChild(el);
    appended.push(el);
    return el;
  };

  /** Fixed-position box so getBoundingClientRect is deterministic. */
  const box = (top: number, height: number, extra: Partial<CSSStyleDeclaration> = {}): HTMLElement => {
    const el = document.createElement('div');
    Object.assign(el.style, { position: 'fixed', left: '0', width: '10px', top: `${top}px`, height: `${height}px` }, extra);
    return append(el);
  };

  const edge = (el: HTMLElement, side: 'top' | 'bottom') => {
    unregisters.push(service.registerEdge(el, side));
    return el;
  };

  const panel = (): FixedPanelRef => {
    const element = append(document.createElement('div'), service.container);
    const ref: FixedPanelRef = { element, close: () => remove(ref) };
    return ref;
  };

  const push = (ref: FixedPanelRef) => {
    service.push(ref);
    pushed.push(ref);
    TestBed.tick();
  };

  const remove = (ref: FixedPanelRef) => {
    service.remove(ref);
    pushed = pushed.filter(p => p !== ref);
    TestBed.tick();
  };

  const prop = (name: string) => service.container.style.getPropertyValue(name);

  beforeEach(() => {
    appended = [];
    unregisters = [];
    pushed = [];
    TestBed.configureTestingModule({
      providers: [{ provide: PlatformLocation, useClass: MockPlatformLocation }]
    });
    service = TestBed.inject(FixedPanelService);
    uiState = TestBed.inject(UiStateService);
  });

  afterEach(() => {
    for (const ref of pushed) {
      service.remove(ref);
    }
    TestBed.tick();
    unregisters.forEach(fn => fn());
    appended.forEach(el => el.remove());
    service.container.remove();
  });

  it('top is the lowest bottom edge of visible top edges', () => {
    edge(box(0, 56), 'top');
    edge(box(56, 48), 'top');

    service.measure();

    expect(prop('--fixed-panel-top')).toBe('104px');
  });

  it('ignores hidden top edges', () => {
    edge(box(0, 0), 'top');
    edge(box(0, 56, { transform: 'translateY(-100%)' }), 'top');

    service.measure();

    expect(prop('--fixed-panel-top')).toBe('0px');
  });

  it('bottom is the distance from the highest visible bottom edge to the viewport bottom', () => {
    service.measure();
    expect(prop('--fixed-panel-bottom')).toBe('0px');

    edge(box(window.innerHeight - 64, 64), 'bottom');
    service.measure();

    expect(prop('--fixed-panel-bottom')).toBe('64px');
  });

  it('re-measures after render when opening reveals hidden chrome without a transition', () => {
    const nav = edge(box(window.innerHeight - 64, 64), 'bottom');
    // Stand-in for the app shell: immersive slides the nav bar out with no transition (reduced motion).
    const chrome = TestBed.runInInjectionContext(() =>
      effect(() => {
        nav.style.transform = uiState.immersive() ? 'translateY(100%)' : '';
      })
    );
    uiState.setImmersive(true);
    TestBed.tick();

    push(panel());

    expect(uiState.immersive()).toBeFalse();
    expect(prop('--fixed-panel-bottom')).toBe('64px');
    chrome.destroy();
  });

  it('anyOpen toggles body class', () => {
    const ref = panel();

    push(ref);
    expect(service.anyOpen()).toBeTrue();
    expect(document.body.classList.contains('fixed-panel-open')).toBeTrue();

    remove(ref);
    expect(service.anyOpen()).toBeFalse();
    expect(document.body.classList.contains('fixed-panel-open')).toBeFalse();
  });

  it('keeps header visible while a panel is open', () => {
    const ref = panel();
    push(ref);

    uiState.setHeaderVisibility(false);
    TestBed.tick();
    expect(uiState.headerVisible()).toBeTrue();

    remove(ref);
    uiState.setHeaderVisibility(false);
    TestBed.tick();
    expect(uiState.headerVisible()).toBeFalse();
    uiState.setHeaderVisibility(true);
  });

  it('inerts everything except edges and the top panel', () => {
    const top = edge(box(0, 56), 'top');
    const bottom = edge(box(window.innerHeight - 64, 64), 'bottom');
    const content = append(document.createElement('div'));
    content.id = 'content';
    const lower = panel();
    const upper = panel();

    push(lower);
    push(upper);

    expect(content.inert).toBeTrue();
    expect(lower.element.inert).toBeTrue();
    expect(upper.element.inert).toBeFalse();
    expect(top.inert).toBeFalse();
    expect(bottom.inert).toBeFalse();
    expect(service.container.inert).toBeFalse();

    remove(upper);
    expect(lower.element.inert).toBeFalse();
    expect(content.inert).toBeTrue();

    remove(lower);
    expect(content.inert).toBeFalse();
    expect(lower.element.inert).toBeFalse();
    expect(upper.element.inert).toBeFalse();
    expect(document.body.querySelectorAll('[inert]').length).toBe(0);
  });

  it('closeTop closes only the top panel', () => {
    const a = panel();
    const b = panel();
    push(a);
    push(b);

    service.closeTop();
    expect(service.isTop(a)).toBeTrue();
    expect(service.anyOpen()).toBeTrue();

    service.closeTop();
    expect(service.anyOpen()).toBeFalse();
  });

  it('isTop reflects push order', () => {
    const a = panel();
    const b = panel();

    push(a);
    expect(service.isTop(a)).toBeTrue();

    push(b);
    expect(service.isTop(a)).toBeFalse();
    expect(service.isTop(b)).toBeTrue();

    remove(b);
    expect(service.isTop(a)).toBeTrue();
  });

  it('keeps toolbar popups live', () => {
    const overlay = document.createElement('div');
    overlay.className = 'cdk-overlay-container';
    append(overlay);
    const ref = panel();

    push(ref);

    expect(overlay.inert).toBeFalse();
  });
});

describe('FixedPanelService history', () => {
  let service: FixedPanelService;
  let location: MockPlatformLocation;
  let routerEvents: Subject<RouterEvent>;
  let open: FixedPanelRef[];
  let closeCalls: number;

  /** Lets the coalesced history sync (a microtask) and its popstate run. */
  const settle = () => new Promise<void>(resolve => setTimeout(resolve));

  const level = () => (location.getState() as any)?.fixedPanelLevel ?? 0;
  // MockPlatformLocation keeps its history private.
  const entryCount = (): number => (location as any).urlChanges.length;
  const entryIndex = (): number => (location as any).urlChangeIndex;

  const panel = (): FixedPanelRef => {
    const element = document.createElement('div');
    service.container.appendChild(element);
    const ref: FixedPanelRef = {
      element,
      close: () => {
        closeCalls++;
        closeByButton(ref);
      }
    };
    return ref;
  };

  const openPanel = (ref = panel()) => {
    service.push(ref);
    open.push(ref);
    TestBed.tick();
    return ref;
  };

  const closeByButton = (ref: FixedPanelRef) => {
    service.remove(ref);
    open = open.filter(p => p !== ref);
    TestBed.tick();
  };

  beforeEach(() => {
    open = [];
    closeCalls = 0;
    routerEvents = new Subject<RouterEvent>();
    TestBed.configureTestingModule({
      providers: [
        { provide: PlatformLocation, useClass: MockPlatformLocation },
        { provide: Router, useValue: { events: routerEvents, currentNavigation: signal(null) } }
      ]
    });
    location = TestBed.inject(PlatformLocation) as MockPlatformLocation;
    // The page's own entry, as the router leaves it.
    location.pushState({ navigationId: 3 }, '', '/search?q=x');
    service = TestBed.inject(FixedPanelService);
  });

  afterEach(() => {
    open.forEach(p => service.remove(p));
    TestBed.tick();
    service.container.remove();
  });

  it('opening a panel pushes a same-URL entry that keeps the router state', async () => {
    const entries = entryCount();
    openPanel();
    await settle();

    expect(entryCount()).toBe(entries + 1);
    expect(location.url).toBe('/search?q=x');
    expect(location.getState()).toEqual({ navigationId: 3, fixedPanelLevel: 1 });
  });

  it('back closes the open panel and stays on the page', async () => {
    openPanel();
    await settle();

    location.back();
    await settle();

    expect(closeCalls).toBe(1);
    expect(service.anyOpen()).toBeFalse();
    expect(location.url).toBe('/search?q=x');
    expect(level()).toBe(0);
  });

  it('back closes only the top of nested panels', async () => {
    const parent = openPanel();
    openPanel();
    await settle();
    expect(level()).toBe(2);

    location.back();
    await settle();

    expect(closeCalls).toBe(1);
    expect(service.isTop(parent)).toBeTrue();
    expect(level()).toBe(1);
  });

  it('closing by the button drops the panel entry again', async () => {
    const ref = openPanel();
    await settle();
    const index = entryIndex();

    closeByButton(ref);
    await settle();

    expect(entryIndex()).toBe(index - 1);
    expect(level()).toBe(0);
    expect(closeCalls).toBe(0);
  });

  it('a panel swapped for another in the same task reuses the entry', async () => {
    const first = openPanel();
    await settle();
    const index = entryIndex();

    closeByButton(first);
    openPanel();
    await settle();

    expect(entryIndex()).toBe(index);
    expect(level()).toBe(1);
  });

  it('a navigation inside an open panel gets a fresh panel entry on top', async () => {
    openPanel();
    await settle();

    // A filter change pushes a new router entry over the panel's.
    location.pushState({ navigationId: 4 }, '', '/search?q=y');
    routerEvents.next(new NavigationEnd(4, '/search?q=y', '/search?q=y'));
    await settle();

    expect(location.url).toBe('/search?q=y');
    expect(location.getState()).toEqual({ navigationId: 4, fixedPanelLevel: 1 });

    // Back closes the panel and keeps the new filters.
    location.back();
    await settle();
    expect(closeCalls).toBe(1);
    expect(location.url).toBe('/search?q=y');
  });

  it('forward into the entry of a closed panel goes back to the page', async () => {
    openPanel();
    await settle();
    location.back();
    await settle();
    const index = entryIndex();

    location.forward();
    await settle();

    expect(entryIndex()).toBe(index);
    expect(service.anyOpen()).toBeFalse();
  });
});
