import { Injectable, signal, computed, effect, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SettingsService } from '../../modules/settings/settings.service';
import { AppSettingsThemeEnum } from '../../modules/settings/settings.model';

export interface AccessibilitySettings {
  textScale: number;
  highContrast: boolean;
  largeComponents: boolean;
  reduceMotion: boolean;
  focusVisible: boolean;
  screenReaderOptimized: boolean;
  dyslexiaFriendly: boolean;
  darkMode: boolean;
  grayscaleMode: boolean;
  lowVisionMode: boolean;
  tritanopiaMode: boolean;
  photophobiaMode: boolean;
}

export const DEFAULT_ACCESSIBILITY_SETTINGS: AccessibilitySettings = {
  textScale: 100,
  highContrast: false,
  largeComponents: false,
  reduceMotion: false,
  focusVisible: false,
  screenReaderOptimized: false,
  dyslexiaFriendly: false,
  darkMode: false,
  grayscaleMode: false,
  lowVisionMode: false,
  tritanopiaMode: false,
  photophobiaMode: false
};

@Injectable({
  providedIn: 'root'
})
export class AccessibilityService {
  private readonly STORAGE_KEY = 'accessibility-settings';

  private settingsService = inject(SettingsService);

  // Dark mode is owned by SettingsService (single source of truth for the app
  // theme). We mirror its effective value into a signal so templates that read
  // `settings().darkMode` stay reactive.
  private darkModeSignal = signal<boolean>(false);

  private settingsSignal = signal<AccessibilitySettings>(this.loadSettings());

  readonly settings = computed<AccessibilitySettings>(() => ({
    ...this.settingsSignal(),
    darkMode: this.darkModeSignal(),
  }));

  readonly textScaleClass = computed(() => {
    const scale = this.settings().textScale;
    if (scale === 125) return 'text-scale-125';
    if (scale === 150) return 'text-scale-150';
    if (scale === 200) return 'text-scale-200';
    if (scale === 300) return 'text-scale-300';
    return 'text-scale-100';
  });

  // Classes applied to <body>. Note: `dark` is intentionally NOT here — the
  // app theme (light/dark) is owned by SettingsService and applied to <html>.
  readonly accessibilityClasses = computed(() => {
    const settings = this.settingsSignal();
    const classes: string[] = [this.textScaleClass()];

    if (settings.highContrast) classes.push('high-contrast');
    if (settings.largeComponents) classes.push('large-components');
    if (settings.reduceMotion) classes.push('reduce-motion');
    if (settings.focusVisible) classes.push('focus-visible');
    if (settings.screenReaderOptimized) classes.push('screen-reader-optimized');
    if (settings.dyslexiaFriendly) classes.push('dyslexia-friendly');
    if (settings.grayscaleMode) classes.push('grayscale-mode');
    if (settings.lowVisionMode) classes.push('low-vision-mode');
    if (settings.tritanopiaMode) classes.push('tritanopia-mode');
    if (settings.photophobiaMode) classes.push('photophobia-mode');

    return classes;
  });

  constructor() {
    // Mirror the app's effective theme into our dark-mode signal so the toggle
    // reflects reality (including System preference) and stays in sync.
    this.settingsService.effectiveTheme$
      .pipe(takeUntilDestroyed())
      .subscribe(theme => this.darkModeSignal.set(theme === 'dark'));

    effect(() => {
      this.applyAccessibilitySettings();
      this.saveSettings();
    });
  }

  updateSettings(newSettings: Partial<AccessibilitySettings>): void {
    this.settingsSignal.update(current => ({
      ...current,
      ...newSettings
    }));
  }

  resetToDefaults(): void {
    this.settingsSignal.set(DEFAULT_ACCESSIBILITY_SETTINGS);
  }

  setTextScale(scale: number): void {
    this.updateSettings({ textScale: scale });
  }

  toggleLargeComponents(): void {
    this.updateSettings({ largeComponents: !this.settings().largeComponents });
  }

  toggleReduceMotion(): void {
    this.updateSettings({ reduceMotion: !this.settings().reduceMotion });
  }

  toggleScreenReaderOptimization(): void {
    this.updateSettings({ screenReaderOptimized: !this.settings().screenReaderOptimized });
  }

  toggleDyslexiaFriendly(): void {
    this.updateSettings({ dyslexiaFriendly: !this.settings().dyslexiaFriendly });
  }

  toggleHighContrast(): void {
    this.updateSettings({ highContrast: !this.settings().highContrast });
  }

  toggleDarkMode(): void {
    // Delegate to the single source of truth for the app theme.
    this.settingsService.toggleLightDarkMode();
  }

  toggleGrayscaleMode(): void {
    this.updateSettings({ grayscaleMode: !this.settings().grayscaleMode });
  }

  toggleLowVisionMode(): void {
    this.updateSettings({ lowVisionMode: !this.settings().lowVisionMode });
  }

  toggleTritanopiaMode(): void {
    this.updateSettings({ tritanopiaMode: !this.settings().tritanopiaMode });
  }

  togglePhotophobiaMode(): void {
    this.updateSettings({ photophobiaMode: !this.settings().photophobiaMode });
  }

  private loadSettings(): AccessibilitySettings {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // darkMode is owned by SettingsService — never restore it from here.
        delete parsed.darkMode;
        return { ...DEFAULT_ACCESSIBILITY_SETTINGS, ...parsed };
      }
    } catch (error) {
      console.warn('Failed to load accessibility settings:', error);
    }
    return DEFAULT_ACCESSIBILITY_SETTINGS;
  }

  private saveSettings(): void {
    try {
      // Persist everything except darkMode (owned by SettingsService).
      const toStore = { ...this.settings() };
      delete (toStore as Partial<AccessibilitySettings>).darkMode;
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(toStore));
    } catch (error) {
      console.warn('Failed to save accessibility settings:', error);
    }
  }

  private applyAccessibilitySettings(): void {
    const body = document.body;
    const html = document.documentElement;
    const classes = this.accessibilityClasses();

    // Remove existing accessibility classes (never touch `dark` — SettingsService
    // owns the app theme on <html>).
    body.classList.remove(
      'text-scale-100', 'text-scale-125', 'text-scale-150', 'text-scale-200', 'text-scale-300',
      'high-contrast', 'large-components', 'reduce-motion',
      'focus-visible', 'screen-reader-optimized', 'dyslexia-friendly',
      'grayscale-mode', 'low-vision-mode',
      'tritanopia-mode', 'photophobia-mode'
    );

    // Apply current accessibility classes to <body>...
    body.classList.add(...classes);

    // ...and mirror a few classes onto <html>:
    // - `high-contrast` so its CSS-variable palette overrides :root / :root.dark.
    // - the filter-based vision modes so the page-wide `filter` lives on the true
    //   root and also covers CDK overlays (dialogs/menus) that are appended to
    //   <body> as siblings of <app-root>; a `filter` on <body> does not reliably
    //   cover those fixed-positioned overlays.
    const s = this.settingsSignal();
    html.classList.toggle('high-contrast', s.highContrast);
    html.classList.toggle('grayscale-mode', s.grayscaleMode);
    html.classList.toggle('tritanopia-mode', s.tritanopiaMode);
    html.classList.toggle('photophobia-mode', s.photophobiaMode);

    // Set CSS custom property for text scaling
    const scale = this.settings().textScale;
    document.documentElement.style.setProperty('--accessibility-text-scale', `${scale / 100}`);

    // Apply reduce motion preference
    if (this.settings().reduceMotion) {
      document.documentElement.style.setProperty('--accessibility-transition-duration', '0ms');
      document.documentElement.style.setProperty('--accessibility-animation-duration', '0ms');
    } else {
      document.documentElement.style.removeProperty('--accessibility-transition-duration');
      document.documentElement.style.removeProperty('--accessibility-animation-duration');
    }
  }
}
