import { Component, inject } from '@angular/core';
import { CdkScrollable } from '@angular/cdk/scrolling';
import { ConfigService } from '../../core/config/config.service';

@Component({
  selector: 'app-search-page',
  templateUrl: './search-page.component.html',
  styleUrl: './search-page.component.scss',
  standalone: false,
  hostDirectives: [CdkScrollable],
})
export class SearchPageComponent {
  private configService = inject(ConfigService);
  sections = this.configService.homeSections;
}
