import { inertOthers } from './inert-others';

describe('inertOthers', () => {
  let root: HTMLElement;
  const el = (id: string) => root.querySelector('#' + id) as HTMLElement;

  beforeEach(() => {
    root = document.createElement('div');
    root.innerHTML =
      '<div id="a"><div id="a1"></div><div id="a2"></div></div>' +
      '<div id="b"></div>' +
      '<div id="c"><div id="c1"></div></div>';
    document.body.appendChild(root);
  });

  afterEach(() => {
    root.remove();
  });

  it('inerts siblings of kept elements and their ancestors\' siblings', () => {
    inertOthers([el('a1'), el('c1')], root);

    expect(el('a2').hasAttribute('inert')).toBeTrue();
    expect(el('b').hasAttribute('inert')).toBeTrue();
    expect(el('a').hasAttribute('inert')).toBeFalse();
    expect(el('a1').hasAttribute('inert')).toBeFalse();
    expect(el('c').hasAttribute('inert')).toBeFalse();
    expect(el('c1').hasAttribute('inert')).toBeFalse();
  });

  it('does not touch elements that were already inert', () => {
    el('b').inert = true;
    const undo = inertOthers([el('a1'), el('c1')], root);
    undo();

    expect(el('b').inert).toBeTrue();
  });

  it('undo removes only what it added', () => {
    const undo = inertOthers([el('a1'), el('c1')], root);
    undo();

    expect(el('a2').hasAttribute('inert')).toBeFalse();
  });

  it('skips script/style/template and text nodes', () => {
    const style = document.createElement('style');
    const script = document.createElement('script');
    const template = document.createElement('template');
    root.append(style, script, template, document.createTextNode('text'));

    inertOthers([el('a1')], root);

    expect(style.hasAttribute('inert')).toBeFalse();
    expect(script.hasAttribute('inert')).toBeFalse();
    expect(template.hasAttribute('inert')).toBeFalse();
  });
});
