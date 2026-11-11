/** Axis-aligned box in viewer-element pixels. */
export interface PlacementRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PlacementSize {
  width: number;
  height: number;
}

export interface PlacementOptions {
  /** Gap between the selection box and the toolbar. */
  gap: number;
  /** Clearance kept from the viewer edges. */
  margin: number;
}

/**
 * Where the floating selection toolbar goes, in viewer-element pixels.
 *
 * Tries the sides of the selection in order — right, left, below, above — each
 * kept inside the viewer, and takes the first one that does not cover the
 * visible part of the selection. When none fits (the selection fills the view,
 * or the view is too small), it takes the spot that covers the least of the
 * selection, preferring the earlier candidates on a tie.
 *
 * Pure, so it can be recomputed on every viewport change, resize or collapse.
 */
export function placeSelectionControls(
  selection: PlacementRect,
  container: PlacementSize,
  controls: PlacementSize,
  { gap, margin }: PlacementOptions,
): { top: number; left: number } {
  const { width: cw, height: ch } = controls;

  // Without a measured container there is nothing to clamp against: keep the
  // preferred spot.
  if (container.width <= 0 || container.height <= 0) {
    return { top: selection.y, left: selection.x + selection.width + gap };
  }

  const maxLeft = Math.max(margin, container.width - cw - margin);
  const maxTop = Math.max(margin, container.height - ch - margin);
  const clampLeft = (v: number) => Math.min(Math.max(v, margin), maxLeft);
  const clampTop = (v: number) => Math.min(Math.max(v, margin), maxTop);

  // Only the part of the selection the reader can see needs to stay clear.
  const visible = intersect(selection, { x: 0, y: 0, width: container.width, height: container.height });

  const right = selection.x + selection.width;
  const bottom = selection.y + selection.height;

  const candidates: { top: number; left: number }[] = [
    // Beside the selection, aligned with its top edge.
    { left: right + gap, top: clampTop(selection.y) },
    { left: selection.x - gap - cw, top: clampTop(selection.y) },
    // Below / above it, aligned with its right edge (where the toolbar sits
    // by default, so it does not jump across the screen).
    { left: clampLeft(right - cw), top: bottom + gap },
    { left: clampLeft(right - cw), top: selection.y - gap - ch },
  ];

  const fits = (c: { top: number; left: number }) =>
    c.left >= margin && c.left <= maxLeft && c.top >= margin && c.top <= maxTop;

  const overlap = (c: { top: number; left: number }) =>
    visible ? area(intersect(visible, { x: c.left, y: c.top, width: cw, height: ch })) : 0;

  for (const c of candidates) {
    if (fits(c) && overlap(c) === 0) return c;
  }

  // Nothing fits cleanly: clamp every candidate into the viewer, add the
  // viewer's corners, and take the one covering the least of the selection.
  const fallbacks = [
    ...candidates.map(c => ({ left: clampLeft(c.left), top: clampTop(c.top) })),
    { left: maxLeft, top: margin },
    { left: margin, top: margin },
    { left: maxLeft, top: maxTop },
    { left: margin, top: maxTop },
  ];

  let best = fallbacks[0];
  let bestOverlap = overlap(best);
  for (const c of fallbacks.slice(1)) {
    const o = overlap(c);
    if (o < bestOverlap) {
      best = c;
      bestOverlap = o;
    }
  }
  return best;
}

function intersect(a: PlacementRect, b: PlacementRect): PlacementRect | null {
  const x = Math.max(a.x, b.x);
  const y = Math.max(a.y, b.y);
  const r = Math.min(a.x + a.width, b.x + b.width);
  const btm = Math.min(a.y + a.height, b.y + b.height);
  return r > x && btm > y ? { x, y, width: r - x, height: btm - y } : null;
}

function area(r: PlacementRect | null): number {
  return r ? r.width * r.height : 0;
}
