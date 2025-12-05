import { DisplayConfig } from '../../shared/models/display-config.model';

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
  displayConfig?: DisplayConfig;

  constructor(
    public thm: AppSettingsThemeEnum = AppSettingsThemeEnum.LIGHT,
    public view: AppResultsViewType = AppResultsViewType.grid,
    public dispConfig?: DisplayConfig
  ) {
    this.theme = thm;
    this.searchResultsView = view;
    this.displayConfig = dispConfig;
  }
}
