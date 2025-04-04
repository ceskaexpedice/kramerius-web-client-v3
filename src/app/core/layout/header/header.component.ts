import { Component } from '@angular/core';
import {LangPickerComponent} from '../../../shared/translation/lang-picker/lang-picker.component';
import {TranslatePipe} from '@ngx-translate/core';
import {Router} from '@angular/router';
import {NgClass, NgIf} from '@angular/common';
import {APP_ROUTES_ENUM} from '../../../app.routes';
import {AutocompleteComponent} from '../../../shared/components/autocomplete/autocomplete.component';
import {HeaderType} from './header-types';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  imports: [
    LangPickerComponent,
    NgIf,
    AutocompleteComponent,
    NgClass,
  ],
  styleUrl: './header.component.scss',
})
export class HeaderComponent {

  headerType: HeaderType = "transparent";

  constructor(private router: Router) {

    this.checkHeaderType();

  }

  get showSearchBar(): boolean {
    return this.router.url !== `/${APP_ROUTES_ENUM.SEARCH}`;
  }

  logoClicked() {
    this.router.navigate([APP_ROUTES_ENUM.SEARCH]);
  }

  checkHeaderType() {

    if (this.showSearchBar) {
      this.headerType = 'light';
    } else {
      this.headerType = 'transparent';
    }

  }

  get inputTheme(): string {
    return this.headerType === 'light' ? 'dark' : 'light';
  }

}
