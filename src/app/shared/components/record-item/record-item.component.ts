import {Component, Input} from '@angular/core';
import {SearchDocument} from '../../../modules/models/search-document';
import {NgClass, NgIf} from '@angular/common';
import {TranslatePipe} from '@ngx-translate/core';

@Component({
  selector: 'app-record-item',
  imports: [
    NgIf,
    NgClass,
    TranslatePipe,
  ],
  templateUrl: './record-item.component.html',
  styleUrl: './record-item.component.scss'
})
export class RecordItemComponent {

  @Input() record: SearchDocument = {} as SearchDocument;

  modelLabel: Record<string, string> = {
    periodical: 'Periodikum',
    monograph: 'Kniha',
    article: 'Článok',
    // ... ďalšie typy podľa potreby
  };

  getAccessLabel(access: string): string {
    switch (access) {
      case 'public':
        return 'Verejné';
      case 'login':
        return 'Po prihlásení';
      case 'protected':
        return 'V knižovni';
      default:
        return '';
    }
  }

  getAccessClass(access: string): string {
    return {
      public: 'access-public',
      login: 'access-login',
      protected: 'access-library',
    }[access] || '';
  }
}
