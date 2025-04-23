import { Component, OnInit, OnDestroy } from '@angular/core';
import {Router, NavigationEnd, RouterLink} from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { APP_ROUTES_ENUM } from '../../../app.routes';
import { HeaderType } from './header-types';
import { SettingsService } from '../../../modules/settings/settings.service';
import { AppSettingsThemeEnum } from '../../../modules/settings/settings.model';
import {NgClass, NgIf} from '@angular/common';
import {AutocompleteComponent} from '../../../shared/components/autocomplete/autocomplete.component';
import {LangPickerComponent} from '../../../shared/translation/lang-picker/lang-picker.component';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  imports: [
    NgClass,
    NgIf,
    AutocompleteComponent,
    LangPickerComponent,
    RouterLink,
  ],
  styleUrl: './header.component.scss'
})
export class HeaderComponent implements OnInit, OnDestroy {
  headerType: HeaderType = 'transparent';
  private routerSubscription?: Subscription;
  private themeSubscription?: Subscription;

  // Track the application's current theme
  currentAppTheme: AppSettingsThemeEnum = AppSettingsThemeEnum.LIGHT;

  constructor(
    private router: Router,
    private settingsService: SettingsService
  ) {}

  ngOnInit() {
    // Listen for route changes to update header type
    this.routerSubscription = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        this.updateHeaderType();
      });

    // Subscribe to app theme changes
    this.themeSubscription = this.settingsService.settings$.subscribe(settings => {
      this.currentAppTheme = settings.theme;
      // This ensures header appearance updates when app theme changes
      this.updateHeaderType();
    });

    // Initial check
    this.updateHeaderType();
  }

  ngOnDestroy() {
    this.routerSubscription?.unsubscribe();
    this.themeSubscription?.unsubscribe();
  }

  get showSearchBar(): boolean {
    return this.router.url !== `/${APP_ROUTES_ENUM.SEARCH}`;
  }

  logoClicked() {
    this.router.navigate([APP_ROUTES_ENUM.SEARCH]);
  }

  updateHeaderType() {
    if (this.showSearchBar) {
      this.headerType = 'light';
    } else {
      this.headerType = 'transparent';
    }
  }

  get inputTheme(): string {
    // If header is transparent, the input theme should be based on the app theme
    if (this.headerType === 'transparent') {
      return this.currentAppTheme === AppSettingsThemeEnum.DARK ? 'light' : 'dark';
    }

    // If header is light, use dark input theme regardless of app theme
    return 'dark';
  }


  openSettings() {
    this.settingsService.openSettingsDialog();
  }
}
