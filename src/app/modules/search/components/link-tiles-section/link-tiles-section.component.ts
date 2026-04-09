import { Component, inject, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { CategoryItemComponent } from '../../../../shared/components/category-item/category-item.component';
import { HomepageSectionConfig, HomepageLinkItem, LocalizedLabel } from '../../../../core/config/config.interfaces';
import { getModelIcon } from '../../../../shared/utils/filter-icons.utils';
import { LocalizedPipe } from '../../../../shared/pipes/localized.pipe';
import { AppTranslationService } from '../../../../shared/translation/app-translation.service';
import { ConfigService } from '../../../../core/config/config.service';

@Component({
  selector: 'app-link-tiles-section',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    CategoryItemComponent,
    LocalizedPipe
  ],
  templateUrl: './link-tiles-section.component.html',
  styleUrls: ['./link-tiles-section.component.scss', '../search-section.scss']
})
export class LinkTilesSectionComponent {
  @Input() config!: HomepageSectionConfig;

  private translationService = inject(AppTranslationService);
  private configService = inject(ConfigService);

  get categories(): HomepageLinkItem[] {
    return (this.config.categories || []) as HomepageLinkItem[];
  }

  resolveLabel(label: string | LocalizedLabel): string {
    const lang = this.translationService.currentLanguage().code;
    return this.configService.resolveLabel(label, lang);
  }

  /**
   * Get icon for a category - use explicit icon from config or derive from type/label using getModelIcon
   */
  getIcon(category: HomepageLinkItem): string {
    if (category.icon) {
      return category.icon;
    }
    return getModelIcon(category.type ?? '') ?? '';
  }
}
