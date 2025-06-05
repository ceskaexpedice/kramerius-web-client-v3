export enum AppSettingsThemeEnum {
  LIGHT = 'light',
  DARK = 'dark',
  SYSTEM = 'system'
}

export enum AppResultsViewType {
  grid = 'grid',
  list = 'list'
}

export class Settings {
  theme: AppSettingsThemeEnum = AppSettingsThemeEnum.SYSTEM;
  searchResultsView: AppResultsViewType = AppResultsViewType.grid;

  constructor(
    public thm: AppSettingsThemeEnum = AppSettingsThemeEnum.LIGHT,
    public view: AppResultsViewType = AppResultsViewType.grid
  ) {
    this.theme = thm;
    this.searchResultsView = view;
  }
}
