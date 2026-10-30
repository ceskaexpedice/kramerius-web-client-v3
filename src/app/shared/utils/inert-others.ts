const SKIPPED_TAGS = new Set(['SCRIPT', 'STYLE', 'TEMPLATE']);

/**
 * Marks everything under `root` as `inert` except the `keep` elements (with their subtrees)
 * and the ancestors leading to them. Elements that were already inert are left untouched.
 * Returns an undo function that removes only the `inert` attributes added here.
 */
export function inertOthers(keep: Element[], root: HTMLElement = document.body): () => void {
  const keepSet = new Set<Element>(keep);
  const ancestors = new Set<Element>();
  for (const el of keep) {
    let parent = el.parentElement;
    while (parent && parent !== root) {
      ancestors.add(parent);
      parent = parent.parentElement;
    }
  }

  const changed: HTMLElement[] = [];
  const walk = (parent: Element) => {
    for (const child of Array.from(parent.children)) {
      if (keepSet.has(child)) {
        continue;
      }
      if (ancestors.has(child)) {
        walk(child);
      } else if (
        child instanceof HTMLElement &&
        !child.inert &&
        !SKIPPED_TAGS.has(child.tagName)
      ) {
        child.inert = true;
        changed.push(child);
      }
    }
  };
  walk(root);

  return () => {
    for (const el of changed) {
      el.inert = false;
    }
  };
}
