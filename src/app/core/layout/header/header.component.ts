import { Component } from '@angular/core';
import {LangPickerComponent} from '../../../shared/translation/lang-picker/lang-picker.component';
import {TranslatePipe} from '@ngx-translate/core';
import {Router} from '@angular/router';
import {NgClass, NgIf} from '@angular/common';
import {APP_ROUTES_ENUM} from '../../../app.routes';
import {AutocompleteComponent} from '../../../shared/components/autocomplete/autocomplete.component';

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
  constructor(private router: Router) {}

  get showSearchBar(): boolean {
    return this.router.url !== `/${APP_ROUTES_ENUM.SEARCH}`;
  }

  logoClicked() {
    this.router.navigate([APP_ROUTES_ENUM.SEARCH]);
  }

  getTheme() {
    if (this.showSearchBar) {
      return 'light';
    }

    return 'transparent';
  }

}
