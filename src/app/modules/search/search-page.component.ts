import { Component, inject } from '@angular/core';
import { ConfigService } from '../../core/config/config.service';
import { AsyncPipe, NgForOf, NgIf } from '@angular/common';

@Component({
  selector: 'app-search-page',
  templateUrl: './search-page.component.html',
  styleUrl: './search-page.component.scss',
  standalone: false
})
export class SearchPageComponent {
  private configService = inject(ConfigService);
  sections = this.configService.homeSections;
}
