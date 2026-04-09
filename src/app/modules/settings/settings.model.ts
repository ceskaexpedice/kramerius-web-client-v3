import { DisplayConfig } from '../../shared/models/display-config.model';

export enum AppSettingsThemeEnum {
  LIGHT = 'light',
  DARK = 'dark',
  SYSTEM = 'system'
}

export enum AppResultsViewType {
  grid = 'grid',
  list = 'list',
  map = 'map'
}

export interface TtsVoiceEntry {
  langCode: string;
  voice: string;
  provider: 'openai' | 'google' | 'elevenlabs';
  isPrimary?: boolean;
}

export class Settings {
  theme: AppSettingsThemeEnum = AppSettingsThemeEnum.SYSTEM;
  searchResultsView: AppResultsViewType = AppResultsViewType.grid;
  displayConfig?: DisplayConfig;
  ttsVoices: TtsVoiceEntry[] = [];

  constructor(
    public thm: AppSettingsThemeEnum = AppSettingsThemeEnum.LIGHT,
    public view: AppResultsViewType = AppResultsViewType.grid,
    displayConfig?: DisplayConfig
  ) {
    this.theme = thm;
    this.searchResultsView = view;
    this.displayConfig = displayConfig;
  }
}
