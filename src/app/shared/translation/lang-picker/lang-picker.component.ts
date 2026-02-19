import { Component, inject } from '@angular/core';
import {NgFor, NgIf} from '@angular/common';
import { AppTranslationService } from '../app-translation.service';
import { Language } from './language';
import {ClickOutsideDirective} from '../../directives/click-outside';

@Component({
  selector: 'app-lang-picker',
  standalone: true,
  imports: [NgFor, NgIf, ClickOutsideDirective],
  templateUrl: './lang-picker.component.html',
  styleUrl: './lang-picker.component.scss'
})
export class LangPickerComponent {
  private translationService = inject(AppTranslationService);

  languages: Language[] = this.translationService.languages;
  currentLanguage = this.translationService.currentLanguage;
  expanded = false;

  clickedIcon() {
    this.expanded = !this.expanded;
  }

  close() {
    if (this.expanded) {
      this.expanded = false;
    }
  }

  changeLang(langCode: string) {
    this.translationService.switchLanguage(langCode);
    this.expanded = false;
  }
}
