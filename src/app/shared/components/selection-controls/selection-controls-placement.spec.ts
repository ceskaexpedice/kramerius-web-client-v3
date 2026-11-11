import { placeSelectionControls, PlacementRect } from './selection-controls-placement';

/**
 * The floating selection toolbar follows the selection unless the reader moved
 * it. When the viewer area shrinks (AI panel opened) it has to find a new spot
 * that keeps the selected area visible, instead of being pushed onto it.
 */
describe('placeSelectionControls', () => {
  const opts = { gap: 10, margin: 8 };
  const controls = { width: 48, height: 200 };

  function overlaps(sel: PlacementRect, pos: { top: number; left: number }): boolean {
    return pos.left < sel.x + sel.width && pos.left + controls.width > sel.x
      && pos.top < sel.y + sel.height && pos.top + controls.height > sel.y;
  }

  it('sits just right of the selection, aligned with its top, when there is room', () => {
    const sel = { x: 100, y: 120, width: 200, height: 150 };
    expect(placeSelectionControls(sel, { width: 1000, height: 800 }, controls, opts))
      .toEqual({ left: 310, top: 120 });
  });

  it('moves to the left side when the viewer narrows and the right side runs out', () => {
    const sel = { x: 300, y: 120, width: 250, height: 150 };
    // Was 1000 wide; the AI panel took the right half.
    const pos = placeSelectionControls(sel, { width: 580, height: 800 }, controls, opts);
    expect(pos).toEqual({ left: 300 - 10 - 48, top: 120 });
    expect(overlaps(sel, pos)).toBeFalse();
  });

  it('goes below the selection when neither side has room', () => {
    const sel = { x: 20, y: 50, width: 500, height: 150 };
    const pos = placeSelectionControls(sel, { width: 540, height: 800 }, controls, opts);
    expect(pos.top).toBe(50 + 150 + 10);
    expect(overlaps(sel, pos)).toBeFalse();
  });

  it('goes above the selection when it fills the sides and the bottom', () => {
    const sel = { x: 20, y: 400, width: 500, height: 380 };
    const pos = placeSelectionControls(sel, { width: 540, height: 800 }, controls, opts);
    expect(pos.top).toBe(400 - 10 - 200);
    expect(overlaps(sel, pos)).toBeFalse();
  });

  it('covers as little of the selection as possible when nothing fits cleanly', () => {
    // Selection covers the whole view except a strip at the top-left corner.
    const sel = { x: 60, y: 0, width: 600, height: 600 };
    const pos = placeSelectionControls(sel, { width: 600, height: 600 }, controls, opts);
    expect(pos.left).toBe(8);
  });

  it('stays inside the viewer', () => {
    const sel = { x: -500, y: -300, width: 2000, height: 2000 };
    const pos = placeSelectionControls(sel, { width: 600, height: 500 }, controls, opts);
    expect(pos.left).toBeGreaterThanOrEqual(8);
    expect(pos.left).toBeLessThanOrEqual(600 - 48 - 8);
    expect(pos.top).toBeGreaterThanOrEqual(8);
    expect(pos.top).toBeLessThanOrEqual(500 - 200 - 8);
  });
});
