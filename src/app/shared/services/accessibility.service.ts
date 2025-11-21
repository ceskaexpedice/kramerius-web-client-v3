import { Injectable, signal, computed, effect } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface AccessibilitySettings {
  textScale: number;
  highContrast: boolean;
  largeComponents: boolean;
  reduceMotion: boolean;
  focusVisible: boolean;
  screenReaderOptimized: boolean;
  dyslexiaFriendly: boolean;
}

export const DEFAULT_ACCESSIBILITY_SETTINGS: AccessibilitySettings = {
  textScale: 100,
  highContrast: false,
  largeComponents: false,
  reduceMotion: false,
  focusVisible: true,
  screenReaderOptimized: false,
  dyslexiaFriendly: false
};

@Injectable({
  providedIn: 'root'
})
export class AccessibilityService {
  private readonly STORAGE_KEY = 'accessibility-settings';

  private settingsSignal = signal<AccessibilitySettings>(this.loadSettings());

  readonly settings = this.settingsSignal.asReadonly();

  readonly textScaleClass = computed(() => {
    const scale = this.settings().textScale;
    if (scale === 125) return 'text-scale-125';
    if (scale === 150) return 'text-scale-150';
    if (scale === 200) return 'text-scale-200';
    if (scale === 300) return 'text-scale-300';
    return 'text-scale-100';
  });

  readonly accessibilityClasses = computed(() => {
    const settings = this.settings();
    const classes: string[] = [this.textScaleClass()];

    if (settings.highContrast) classes.push('high-contrast');
    if (settings.largeComponents) classes.push('large-components');
    if (settings.reduceMotion) classes.push('reduce-motion');
    if (settings.focusVisible) classes.push('focus-visible');
    if (settings.screenReaderOptimized) classes.push('screen-reader-optimized');
    if (settings.dyslexiaFriendly) classes.push('dyslexia-friendly');

    return classes;
  });

  constructor() {
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

  setTextScale(scale: 100 | 125 | 150 | 200 | 300): void {
    this.updateSettings({ textScale: scale });
  }

  toggleHighContrast(): void {
    this.updateSettings({ highContrast: !this.settings().highContrast });
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

  private loadSettings(): AccessibilitySettings {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...DEFAULT_ACCESSIBILITY_SETTINGS, ...parsed };
      }
    } catch (error) {
      console.warn('Failed to load accessibility settings:', error);
    }
    return DEFAULT_ACCESSIBILITY_SETTINGS;
  }

  private saveSettings(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.settings()));
    } catch (error) {
      console.warn('Failed to save accessibility settings:', error);
    }
  }

  private applyAccessibilitySettings(): void {
    const body = document.body;
    const classes = this.accessibilityClasses();

    // Remove existing accessibility classes
    body.classList.remove(
      'text-scale-100', 'text-scale-125', 'text-scale-150', 'text-scale-200', 'text-scale-300',
      'high-contrast', 'large-components', 'reduce-motion',
      'focus-visible', 'screen-reader-optimized', 'dyslexia-friendly'
    );

    // Apply current accessibility classes
    body.classList.add(...classes);

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