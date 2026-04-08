import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { NgFor } from '@angular/common';
import { Language } from '../../translation/lang-picker/language';
import { ClickOutsideDirective } from '../../directives/click-outside';
import { LanguageBadgeComponent } from '../language-badge/language-badge.component';

@Component({
  selector: 'app-language-select',
  standalone: true,
  imports: [NgFor, ClickOutsideDirective, LanguageBadgeComponent],
  templateUrl: './language-select.component.html',
  styleUrl: './language-select.component.scss'
})
export class LanguageSelectComponent {
  @Input({ required: true }) languages: Language[] = [];
  @Input() selectedCode: string | null = null;
  @Input() label: string | null = null;
  @Input() dropdownFixed: boolean = true;
  @Output() langChange = new EventEmitter<string>();

  @ViewChild('trigger') trigger?: ElementRef<HTMLElement>;

  expanded = false;
  dropdownTop = 0;
  dropdownRight = 0;

  get selected(): Language | undefined {
    return this.languages.find(l => l.code === this.selectedCode) || this.languages[0];
  }

  toggle() {
    if (!this.expanded) {
      this.updatePosition();
    }
    this.expanded = !this.expanded;
  }

  close() {
    if (this.expanded) {
      this.expanded = false;
    }
  }

  pick(code: string) {
    this.expanded = false;
    if (code !== this.selectedCode) {
      this.langChange.emit(code);
    }
  }

  private updatePosition() {
    const el = this.trigger?.nativeElement;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    this.dropdownTop = rect.bottom + 4;
    this.dropdownRight = window.innerWidth - rect.right;
  }
}
