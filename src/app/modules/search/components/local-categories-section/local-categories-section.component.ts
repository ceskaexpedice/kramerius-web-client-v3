import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { CategoryItemComponent } from '../../../../shared/components/category-item/category-item.component';
import { HomepageSectionConfig, HomepageLinkItem } from '../../../../core/config/config.interfaces';
import { getModelIcon } from '../../../../shared/utils/filter-icons.utils';

@Component({
  selector: 'app-local-categories-section',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    CategoryItemComponent
  ],
  templateUrl: './local-categories-section.component.html',
  styleUrls: ['./local-categories-section.component.scss', '../search-section.scss']
})
export class LocalCategoriesSectionComponent {
  @Input() config!: HomepageSectionConfig;

  get categories(): HomepageLinkItem[] {
    return (this.config.categories || []) as HomepageLinkItem[];
  }

  /**
   * Get icon for a category - use explicit icon from config or derive from label using getModelIcon
   */
  getIcon(category: HomepageLinkItem): string {
    if (category.icon) {
      return category.icon;
    }
    return getModelIcon(category.label) ?? '';
  }
}
