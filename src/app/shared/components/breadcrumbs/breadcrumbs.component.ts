import { Component, inject, Input } from '@angular/core';
import { Breadcrumb } from '../../models/breadcrumb.model';
import { BreadcrumbsService } from '../../services/breadcrumbs.service';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-breadcrumbs',
  templateUrl: './breadcrumbs.component.html',
  styleUrl: './breadcrumbs.component.scss',
  standalone: true,
  imports: [TranslateModule]
})
export class BreadcrumbsComponent {

  /**
   * Optional custom breadcrumbs to display
   * If not provided, uses breadcrumbs from service
   */
  @Input() breadcrumbs?: Breadcrumb[];

  /**
   * Whether to show separator after last item
   */
  @Input() showTrailingSeparator = false;

  public breadcrumbsService = inject(BreadcrumbsService);

  /**
   * Get breadcrumbs to display
   */
  get displayBreadcrumbs(): Breadcrumb[] {
    return this.breadcrumbs || this.breadcrumbsService.breadcrumbs();
  }

  /**
   * Check if there are multiple breadcrumb paths
   */
  get hasMultiplePaths(): boolean {
    return this.breadcrumbsService.multiplePaths().length > 1;
  }

  /**
   * Get multiple breadcrumb paths
   */
  get multipleBreadcrumbPaths(): Breadcrumb[][] {
    return this.breadcrumbsService.multiplePaths();
  }

  /**
   * Get separator from config
   */
  get separator(): string {
    return this.breadcrumbsService.config().separator || '/';
  }

  /**
   * Handle breadcrumb click
   */
  onBreadcrumbClick(breadcrumb: Breadcrumb, event: MouseEvent): void {
    if (!breadcrumb.clickable) {
      event.preventDefault();
      return;
    }

    event.preventDefault();
    this.breadcrumbsService.navigateTo(breadcrumb);
  }

  /**
   * Check if breadcrumb should show separator after it
   */
  shouldShowSeparator(index: number): boolean {
    const breadcrumbs = this.displayBreadcrumbs;
    const isLast = index === breadcrumbs.length - 1;

    return !isLast || this.showTrailingSeparator;
  }

  /**
   * Get CSS classes for breadcrumb item
   */
  getBreadcrumbClasses(breadcrumb: Breadcrumb, index: number): string[] {
    const classes = ['breadcrumb-item'];
    const isLast = index === this.displayBreadcrumbs.length - 1;

    if (isLast) {
      classes.push('breadcrumb-item--active');
    }

    if (!breadcrumb.clickable) {
      classes.push('breadcrumb-item--non-clickable');
    }

    return classes;
  }
}
