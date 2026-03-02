import {Component, inject} from '@angular/core';
import {SearchService} from '../../../../shared/services/search.service';
import {ConfigService} from '../../../../core/config/config.service';
import {SuggestedSearchTagItem} from '../../../../core/config/config.interfaces';
import {TranslatePipe} from '@ngx-translate/core';

@Component({
  selector: 'app-suggested-search-tags-section',
  imports: [
    TranslatePipe,
  ],
  templateUrl: './suggested-search-tags-section.component.html',
  styleUrl: './suggested-search-tags-section.component.scss'
})
export class SuggestedSearchTagsSectionComponent {
  private configService = inject(ConfigService);

  suggestedTags: SuggestedSearchTagItem[] = this.configService.suggestedTags;

  public searchService = inject(SearchService);

  onTagSelected(filter: string) {
    this.searchService.redirectDirectlyToUrl(filter);
  }

}
