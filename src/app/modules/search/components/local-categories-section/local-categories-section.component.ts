import { Component, inject, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { CategoryItemComponent } from '../../../../shared/components/category-item/category-item.component';
import { HomepageSectionConfig, HomepageLinkItem, LocalizedLabel } from '../../../../core/config/config.interfaces';
import { getModelIcon } from '../../../../shared/utils/filter-icons.utils';
import { LocalizedPipe } from '../../../../shared/pipes/localized.pipe';
import { AppTranslationService } from '../../../../shared/translation/app-translation.service';

@Component({
  selector: 'app-local-categories-section',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    CategoryItemComponent,
    LocalizedPipe
  ],
  templateUrl: './local-categories-section.component.html',
  styleUrls: ['./local-categories-section.component.scss', '../search-section.scss']
})
export class LocalCategoriesSectionComponent {
  @Input() config!: HomepageSectionConfig;

  private translationService = inject(AppTranslationService);

  get categories(): HomepageLinkItem[] {
    return (this.config.categories || []) as HomepageLinkItem[];
  }

  resolveLabel(label: string | LocalizedLabel): string {
    if (typeof label === 'string') return label;
    const lang = this.translationService.currentLanguage().code;
    return label[lang] ?? label['en'] ?? label['cs'] ?? Object.values(label)[0] ?? '';
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
