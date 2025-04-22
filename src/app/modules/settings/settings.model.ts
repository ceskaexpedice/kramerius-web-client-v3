export enum AppSettingsThemeEnum {
  LIGHT = 'light',
  DARK = 'dark',
  SYSTEM = 'system'
}

export class Settings {
  theme: AppSettingsThemeEnum = AppSettingsThemeEnum.SYSTEM;

  constructor(
    public thm: AppSettingsThemeEnum = AppSettingsThemeEnum.LIGHT
  ) {
    this.theme = thm;
  }
}
