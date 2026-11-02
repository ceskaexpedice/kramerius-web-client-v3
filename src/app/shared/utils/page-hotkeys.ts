/**
 * Global page-turn hotkeys (arrow keys) must not fire while the user is typing,
 * operating a composite widget that owns the arrow keys (tabs, listbox, menu,
 * slider…), or reading inside a scrollable side panel, where ↑/↓ should
 * scroll the panel instead of jumping three pages.
 */
const EDITABLE_SELECTOR = 'input, textarea, select, [contenteditable=""], [contenteditable="true"]';
const ARROW_OWNER_SELECTOR = [
  '[role="tablist"]', '[role="tab"]', '[role="listbox"]', '[role="option"]', '[role="menu"]',
  '[role="menuitem"]', '[role="menubar"]', '[role="slider"]', '[role="spinbutton"]', '[role="grid"]',
  '[role="tree"]', '[role="radiogroup"]', '[role="combobox"]', '[role="separator"]', '[role="dialog"]',
  '.mat-mdc-menu-panel', '.cdk-overlay-container',
].join(', ');
/** Panels whose content is scrolled with ↑/↓. */
const PANEL_SELECTOR = 'app-metadata-sidebar, .fixed-panel, .detail-layout--sidebar-right';

export function shouldIgnorePageHotkey(event: KeyboardEvent): boolean {
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
    return true;
  }
  const target = (event.target as Element | null);
  if (!target || !(target instanceof Element)) {
    return false;
  }
  if (target.closest(EDITABLE_SELECTOR) || target.closest(ARROW_OWNER_SELECTOR)) {
    return true;
  }
  // In a side panel ↑/↓ scroll it; ←/→ still turn pages (a mouse user who just
  // clicked a link or group heading in the panel expects that to keep working).
  const vertical = event.key === 'ArrowUp' || event.key === 'ArrowDown';
  return vertical && !!target.closest(PANEL_SELECTOR);
}
