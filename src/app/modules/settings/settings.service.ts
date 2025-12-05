import {AppSettingsThemeEnum, Settings} from './settings.model';
import {BehaviorSubject, Subject} from 'rxjs';
import {MatDialog} from '@angular/material/dialog';
import {inject, Injectable} from '@angular/core';
import {SettingsDialogComponent} from '../../shared/dialogs/settings-dialog/settings-dialog.component';
import {LocalStorageService} from '../../shared/services/local-storage.service';
import {DisplayConfigService} from '../../shared/services/display-config.service';
import {OPTIONAL_SOLR_FIELDS} from '../../modules/search-results-page/const/search-return-fields';

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  private readonly STORAGE_KEY = 'app-settings';

  private _settings = new BehaviorSubject<Settings>(this.loadInitialSettings());
  settings$ = this._settings.asObservable();

  // Subject to emit reload events
  private _reloadSearchResults = new Subject<void>();
  reloadSearchResults$ = this._reloadSearchResults.asObservable();

  private displayConfigService = inject(DisplayConfigService);

  constructor(
    private dialog: MatDialog,
    private localStorage: LocalStorageService
  ) {
    this.applyTheme(this._settings.value.theme);
    this.displayConfigService.loadFromSettings(this._settings.value.displayConfig);
  }

  get settings(): Settings {
    return this._settings.value;
  }

  getSettingsCopy(): Settings {
    const current = this._settings.value;
    const copy: Settings = {
      ...current,
      displayConfig: current.displayConfig ? {
        tableColumns: current.displayConfig.tableColumns.map(col => ({ ...col }))
      } : undefined
    };
    return copy;
  }

  set settings(settings: Settings) {
    const oldSettings = this._settings.value;
    const needsReload = this.checkIfSearchReloadNeeded(oldSettings, settings);

    // Update DisplayConfigService with the incoming displayConfig
    if (settings.displayConfig) {
      this.displayConfigService.loadFromSettings(settings.displayConfig);
    }

    this._settings.next(settings);
    this.saveToStorage(settings);
    this.applyTheme(settings.theme);

    // Reload search if new optional columns were enabled
    if (needsReload) {
      this.reloadSearchResults();
    }
  }

  /**
   * Checks if search results need to be reloaded due to new optional columns being enabled
   */
  private checkIfSearchReloadNeeded(oldSettings: Settings, newSettings: Settings): boolean {
    if (!newSettings.displayConfig || !newSettings.displayConfig.tableColumns) {
      return false;
    }

    // Get old visible column IDs
    const oldVisibleColumnIds = new Set(
      (oldSettings.displayConfig?.tableColumns || [])
        .filter(col => col.visible)
        .map(col => col.id)
    );

    // Get new visible column IDs
    const newVisibleColumnIds = new Set(
      newSettings.displayConfig.tableColumns
        .filter(col => col.visible)
        .map(col => col.id)
    );

    // Check if any NEW optional columns were made visible
    const newlyVisibleOptionalColumns = Array.from(newVisibleColumnIds).filter(
      colId => !oldVisibleColumnIds.has(colId) && OPTIONAL_SOLR_FIELDS[colId]
    );

    return newlyVisibleOptionalColumns.length > 0;
  }

  /**
   * Reloads search results by emitting a reload event
   */
  private reloadSearchResults(): void {
    this._reloadSearchResults.next();
  }

  saveImmediately() {
    this.applyTheme(this._settings.value.theme);
    this.saveToStorage(this.settings);
  }

  get theme(): AppSettingsThemeEnum {
    return this.settings.theme;
  }

  set theme(theme: AppSettingsThemeEnum) {
    const newSettings = { ...this.settings, theme };
    this._settings.next(newSettings);
    this.saveToStorage(newSettings);
    this.applyTheme(theme);
  }

  toggleLightDarkMode(): void {
    this.theme = this.theme === AppSettingsThemeEnum.LIGHT
      ? AppSettingsThemeEnum.DARK
      : AppSettingsThemeEnum.LIGHT;
  }

  resetSettings(): void {
    const defaultSettings = new Settings();
    this._settings.next(defaultSettings);
    this.saveToStorage(defaultSettings);
    this.applyTheme(defaultSettings.theme);
  }

  openSettingsDialog(): void {
    const dialogRef = this.dialog.open(SettingsDialogComponent, {
      width: '80vw',
    });

    dialogRef.afterClosed().subscribe(() => {
    });
  }

  private applyTheme(theme: AppSettingsThemeEnum): void {
    const html = document.documentElement;
    html.classList.remove('light', 'dark');
    html.classList.add(theme.toLowerCase());
  }

  public saveToStorage(settings: Settings): void {
    this.localStorage.set(this.STORAGE_KEY, JSON.stringify(settings));
  }

  public loadInitialSettings(): Settings {
    const saved = this.localStorage.get<any>(this.STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return new Settings(parsed.theme, parsed.searchResultsView, parsed.displayConfig);
      } catch (e) {
        console.warn('⚠️ Could not parse settings from localStorage', e);
      }
    }

    return new Settings(AppSettingsThemeEnum.LIGHT);
  }
}
