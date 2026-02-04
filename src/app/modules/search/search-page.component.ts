import { Component, inject } from '@angular/core';
import { HomeWebConfigService } from './services/home-web-config.service';
import { AsyncPipe, NgForOf, NgIf } from '@angular/common';

@Component({
  selector: 'app-search-page',
  templateUrl: './search-page.component.html',
  styleUrl: './search-page.component.scss',
  standalone: false
})
export class SearchPageComponent {
  private configService = inject(HomeWebConfigService);
  sections$ = this.configService.getConfig();
}
