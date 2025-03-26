import { Component } from '@angular/core';
import {LangPickerComponent} from '../../../shared/translation/lang-picker/lang-picker.component';
import {TranslatePipe} from '@ngx-translate/core';
import {Router} from '@angular/router';
import {NgIf} from '@angular/common';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  imports: [
    LangPickerComponent,
    NgIf,
  ],
  styleUrl: './header.component.scss',
})
export class HeaderComponent {
  constructor(private router: Router) {}

  get showSearchBar(): boolean {
    return this.router.url !== '/search';
  }

}
