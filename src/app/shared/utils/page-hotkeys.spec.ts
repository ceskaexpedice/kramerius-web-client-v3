import { shouldIgnorePageHotkey } from './page-hotkeys';

describe('shouldIgnorePageHotkey', () => {
  let host: HTMLElement;

  beforeEach(() => {
    host = document.createElement('div');
    document.body.appendChild(host);
  });

  afterEach(() => host.remove());

  function keyOn(target: Element, init: KeyboardEventInit = {}): KeyboardEvent {
    const event = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, ...init });
    Object.defineProperty(event, 'target', { value: target });
    return event;
  }

  it('lets arrows through on plain page content', () => {
    host.innerHTML = '<div class="viewer"></div>';
    expect(shouldIgnorePageHotkey(keyOn(host.querySelector('.viewer')!))).toBeFalse();
  });

  it('ignores arrows while typing in an input (regression: page turned while typing)', () => {
    host.innerHTML = '<input type="text">';
    expect(shouldIgnorePageHotkey(keyOn(host.querySelector('input')!))).toBeTrue();
  });

  it('ignores arrows inside composite widgets that own them', () => {
    host.innerHTML = '<div role="tablist"><button role="tab">A</button></div><div role="listbox"><div role="option">x</div></div>';
    expect(shouldIgnorePageHotkey(keyOn(host.querySelector('[role=tab]')!))).toBeTrue();
    expect(shouldIgnorePageHotkey(keyOn(host.querySelector('[role=option]')!))).toBeTrue();
  });

  it('lets ↑/↓ scroll the metadata panel but keeps ←/→ page turning there', () => {
    host.innerHTML = '<app-metadata-sidebar><a href="#">link</a></app-metadata-sidebar>';
    const link = host.querySelector('a')!;
    expect(shouldIgnorePageHotkey(keyOn(link, { key: 'ArrowDown' }))).toBeTrue();
    expect(shouldIgnorePageHotkey(keyOn(link, { key: 'ArrowRight' }))).toBeFalse();
  });

  it('ignores modified arrows (browser / OS shortcuts)', () => {
    host.innerHTML = '<div class="viewer"></div>';
    expect(shouldIgnorePageHotkey(keyOn(host.querySelector('.viewer')!, { altKey: true }))).toBeTrue();
  });
});
