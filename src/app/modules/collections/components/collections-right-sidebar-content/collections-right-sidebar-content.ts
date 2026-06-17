import { Component, computed, EventEmitter, inject, Input, Output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { Metadata } from '../../../../shared/models/metadata.model';
import { BreadcrumbsService } from '../../../../shared/services/breadcrumbs.service';
import { AppTranslationService } from '../../../../shared/translation/app-translation.service';
import { resolveLocalizedValue } from '../../../../shared/utils/language-utils';

@Component({
  selector: 'app-collections-right-sidebar-content',
  imports: [
    TranslatePipe,
  ],
  templateUrl: './collections-right-sidebar-content.html',
  styleUrl: './collections-right-sidebar-content.scss',
})
export class CollectionsRightSidebarContent {

  metadata: Metadata | undefined;

  @Input() showClose = true;
  @Output() onClose = new EventEmitter<void>();

  private breadcrumbsService = inject(BreadcrumbsService);
  private appTranslation = inject(AppTranslationService);

  @Input() set setMetadata(metadata: Metadata) {
    this.metadata = metadata;
  }

  /**
   * Collection title resolved against the current UI language (live, so it updates
   * on language switch). Falls back to the parse-time `mainTitle`.
   */
  get localizedTitle(): string {
    const current = this.appTranslation.currentLanguage().code;
    return resolveLocalizedValue(this.metadata?.collectionTitles, current)
      || this.metadata?.mainTitle
      || '';
  }

  /**
   * Get parent collection names by matching metadata.inCollections UUIDs with breadcrumbs
   */
  collectionNames = computed(() => {
    if (!this.metadata || !this.metadata.inCollections || this.metadata.inCollections.length === 0) {
      return [];
    }

    // Check both breadcrumbs() and multiplePaths() as collections might use either
    let breadcrumbs = this.breadcrumbsService.breadcrumbs();

    // If breadcrumbs is empty, try using the first path from multiplePaths
    if (breadcrumbs.length === 0) {
      const multiplePaths = this.breadcrumbsService.multiplePaths();
      if (multiplePaths.length > 0) {
        breadcrumbs = multiplePaths[0];
      }
    }

    const parentUuids = this.metadata.inCollections.map(c => c.uuid);

    // Match breadcrumbs with parent collection UUIDs
    // Breadcrumb URLs are in format "/collection/{uuid}"
    const names: string[] = [];

    for (const uuid of parentUuids) {
      const breadcrumb = breadcrumbs.find(b => b.url && b.url.includes(uuid));
      if (breadcrumb) {
        names.push(breadcrumb.label);
      }
    }

    return names;
  });

  /**
   * Check if item is in multiple collections
   */
  get isInMultipleCollections(): boolean {
    return this.collectionNames().length > 1;
  }

  close() {
    this.onClose.emit();
  }


}
