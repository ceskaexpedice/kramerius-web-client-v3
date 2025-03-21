import { Component, inject } from '@angular/core';
import {NgFor, NgOptimizedImage} from '@angular/common';
import { AppTranslationService } from '../app-translation.service';
import { Language } from './language';

@Component({
  selector: 'app-lang-picker',
  standalone: true,
  imports: [NgFor],
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

  changeLang(langCode: string) {
    this.translationService.switchLanguage(langCode);
    this.expanded = false;
  }
}
