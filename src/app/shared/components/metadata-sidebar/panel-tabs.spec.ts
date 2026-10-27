import { DESKTOP_PANEL_TAB_ORDER, PANEL_TABS } from './panel-tabs';

describe('panel-tabs', () => {
  it('defines every desktop tab with a label and icon', () => {
    for (const id of DESKTOP_PANEL_TAB_ORDER) {
      expect(PANEL_TABS[id].label).toBeTruthy();
      expect(PANEL_TABS[id].icon).toMatch(/^icon-/);
    }
  });
});
