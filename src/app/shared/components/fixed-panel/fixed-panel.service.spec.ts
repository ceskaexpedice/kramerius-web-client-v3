import { effect } from '@angular/core';
import { TestBed } from '@angular/core/testing';
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
    TestBed.configureTestingModule({});
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
