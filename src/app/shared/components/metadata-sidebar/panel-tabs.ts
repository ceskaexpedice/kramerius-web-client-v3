/**
 * Single source of truth for the sections of the document information panel,
 * shared by the desktop side panel (app-metadata-sidebar tabs) and the mobile
 * bottom nav / fixed panel, so labels and icons never drift apart again.
 */
export type PanelTabId = 'description' | 'pages' | 'export' | 'ai' | 'search';

export interface PanelTabDef {
  id: PanelTabId;
  /** Translation key of the visible label. */
  label: string;
  icon: string;
}

export const PANEL_TABS: Record<PanelTabId, PanelTabDef> = {
  description: { id: 'description', label: 'description', icon: 'icon-textalign-justifycenter' },
  pages: { id: 'pages', label: 'pages--tab', icon: 'icon-simcard-2' },
  export: { id: 'export', label: 'export', icon: 'icon-download' },
  ai: { id: 'ai', label: 'ai.tab', icon: 'icon-magic' },
  search: { id: 'search', label: 'results', icon: 'icon-receipt-search' },
};

/** Order of the tabs in the desktop panel (pages live in the left sidebar there). */
export const DESKTOP_PANEL_TAB_ORDER: PanelTabId[] = ['description', 'export', 'ai', 'search'];
