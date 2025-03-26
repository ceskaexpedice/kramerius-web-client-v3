import { Component } from '@angular/core';
import {FormsModule} from '@angular/forms';

@Component({
  selector: 'app-search-hero',
  imports: [
    FormsModule,
  ],
  templateUrl: './search-hero.component.html',
  styleUrl: './search-hero.component.scss'
})
export class SearchHeroComponent {

  query = '';

  onSearch() {
    console.log('Hľadám:', this.query);
    // TODO: emitovať alebo presmerovať na výsledky
  }

}
