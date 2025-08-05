import {AppSettingsThemeEnum, Settings} from './settings.model';
import {BehaviorSubject} from 'rxjs';
import {MatDialog} from '@angular/material/dialog';
import {Injectable} from '@angular/core';
import {SettingsDialogComponent} from '../../shared/dialogs/settings-dialog/settings-dialog.component';
import {LocalStorageService} from '../../shared/services/local-storage.service';

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  private readonly STORAGE_KEY = 'app-settings';

  private _settings = new BehaviorSubject<Settings>(this.loadInitialSettings());
  settings$ = this._settings.asObservable();

  constructor(
    private dialog: MatDialog,
    private localStorage: LocalStorageService
  ) {
    this.applyTheme(this._settings.value.theme);
  }

  get settings(): Settings {
    return this._settings.value;
  }

  getSettingsCopy(): Settings {
    return { ...this._settings.value };
  }

  set settings(settings: Settings) {
    this._settings.next(settings);
    this.saveToStorage(settings);
    this.applyTheme(settings.theme);
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
        return new Settings(parsed.theme, parsed.searchResultsView);
      } catch (e) {
        console.warn('⚠️ Could not parse settings from localStorage', e);
      }
    }

    // fallback to system preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    return new Settings(prefersDark ? AppSettingsThemeEnum.DARK : AppSettingsThemeEnum.LIGHT);
  }
}
