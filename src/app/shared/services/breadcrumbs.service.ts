import { Injectable, signal } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';
import { Breadcrumb, BreadcrumbConfig } from '../models/breadcrumb.model';

/**
 * Usage:
 * 1. Add breadcrumb data to route config:
 *    { path: 'collections', data: { breadcrumb: 'Collections' } }
 *
 * 2. Inject service and use breadcrumbs signal:
 *    breadcrumbs = breadcrumbsService.breadcrumbs;
 *
 * 3. Optionally override breadcrumbs manually:
 *    breadcrumbsService.setBreadcrumbs([...])
 */
@Injectable({
  providedIn: 'root'
})
export class BreadcrumbsService {

  /**
   * Current breadcrumb trail as a signal
   */
  public breadcrumbs = signal<Breadcrumb[]>([]);

  /**
   * Multiple breadcrumb paths (for collections with multiple parent paths)
   */
  public multiplePaths = signal<Breadcrumb[][]>([]);

  /**
   * Configuration for breadcrumb behavior
   */
  public config = signal<BreadcrumbConfig>({
    showHome: true,
    separator: '/',
    lastItemClickable: false,
    maxItems: undefined
  });

  /**
   * Navigation history (last N visited URLs)
   */
  private navigationHistory: string[] = [];
  private readonly MAX_HISTORY_SIZE = 10;

  /**
   * Manual breadcrumb overrides (keyed by route path)
   */
  private manualOverrides = new Map<string, Breadcrumb[]>();

  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute
  ) {
    this.initializeAutoBreadcrumbs();
  }

  /**
   * Initialize automatic breadcrumb generation from routes
   */
  private initializeAutoBreadcrumbs(): void {
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        const currentUrl = this.router.url.split('?')[0];

        // Add to navigation history
        this.addToHistory(currentUrl);

        // Check for manual override first
        if (this.manualOverrides.has(currentUrl)) {
          this.breadcrumbs.set(this.manualOverrides.get(currentUrl)!);
        } else {
          // Auto-generate from route
          const breadcrumbs = this.buildBreadcrumbsFromRoute(this.activatedRoute.root);
          this.breadcrumbs.set(breadcrumbs);
        }
      });
  }

  /**
   * Build breadcrumb trail from route tree
   */
  private buildBreadcrumbsFromRoute(route: ActivatedRoute): Breadcrumb[] {
    const breadcrumbs: Breadcrumb[] = [];

    // Add home breadcrumb if configured
    if (this.config().showHome) {
      breadcrumbs.push({
        label: 'Home',
        translationKey: 'breadcrumbs.home',
        url: '/',
        icon: 'icon-home',
        clickable: true
      });
    }

    // Build path from route tree
    this.addBreadcrumbsFromRoute(route.root, '/', breadcrumbs);

    // Apply configuration
    const config = this.config();

    // Make last item non-clickable if configured
    if (!config.lastItemClickable && breadcrumbs.length > 0) {
      breadcrumbs[breadcrumbs.length - 1].clickable = false;
    }

    // Truncate if max items specified
    if (config.maxItems && breadcrumbs.length > config.maxItems) {
      return [
        ...breadcrumbs.slice(0, 1),
        { label: '...', url: '', clickable: false },
        ...breadcrumbs.slice(-(config.maxItems - 2))
      ];
    }

    return breadcrumbs;
  }

  /**
   * Recursively build breadcrumbs from route snapshot
   */
  private addBreadcrumbsFromRoute(
    route: ActivatedRoute,
    parentUrl: string,
    breadcrumbs: Breadcrumb[]
  ): void {
    if (!route) return;

    // Build URL for current route
    const routeUrl = this.getRouteUrl(route);
    const currentUrl = routeUrl ? `${parentUrl}/${routeUrl}`.replace('//', '/') : parentUrl;

    // Check if route has breadcrumb data
    const breadcrumbData = route.snapshot.data['breadcrumb'];
    if (breadcrumbData) {
      // Skip if breadcrumb explicitly set to null or false
      if (breadcrumbData === null || breadcrumbData === false) {
        // Continue with children but don't add breadcrumb
      } else if (typeof breadcrumbData === 'string') {
        breadcrumbs.push({
          label: breadcrumbData,
          url: currentUrl,
          clickable: true
        });
      } else if (typeof breadcrumbData === 'object') {
        breadcrumbs.push({
          clickable: true,
          ...breadcrumbData,
          url: breadcrumbData.url || currentUrl
        });
      }
    }

    // Process children
    if (route.children && route.children.length > 0) {
      route.children.forEach(child => {
        this.addBreadcrumbsFromRoute(child, currentUrl, breadcrumbs);
      });
    }
  }

  /**
   * Get URL from route snapshot
   */
  private getRouteUrl(route: ActivatedRoute): string {
    return route.snapshot.url.map(segment => segment.path).join('/');
  }

  /**
   * Manually set breadcrumbs (overrides auto-generation)
   */
  public setBreadcrumbs(breadcrumbs: Breadcrumb[], saveAsOverride = false): void {
    this.breadcrumbs.set(breadcrumbs);
    // Clear multiple paths when setting single breadcrumb
    this.multiplePaths.set([]);

    if (saveAsOverride) {
      const currentUrl = this.router.url.split('?')[0];
      this.manualOverrides.set(currentUrl, breadcrumbs);
    }
  }

  /**
   * Set multiple breadcrumb paths (for items with multiple parent paths)
   */
  public setMultiplePaths(paths: Breadcrumb[][], saveAsOverride = false): void {
    this.multiplePaths.set(paths);
    // Clear single breadcrumb when setting multiple paths
    this.breadcrumbs.set([]);

    if (saveAsOverride) {
      const currentUrl = this.router.url.split('?')[0];
      // Store the first path as override, but keep multiplePaths in memory
      if (paths.length > 0) {
        this.manualOverrides.set(currentUrl, paths[0]);
      }
    }
  }

  /**
   * Add a breadcrumb to the end of the trail
   */
  public addBreadcrumb(breadcrumb: Breadcrumb, saveAsOverride = false): void {
    const current = this.breadcrumbs();
    const newBreadcrumbs = [...current, breadcrumb];
    this.breadcrumbs.set(newBreadcrumbs);

    if (saveAsOverride) {
      const currentUrl = this.router.url.split('?')[0];
      this.manualOverrides.set(currentUrl, newBreadcrumbs);
    }
  }

  /**
   * Check if we should append breadcrumbs based on navigation history
   * Returns true if navigating from a related page (search-results, collection, periodical, etc.)
   */
  public shouldAppendBreadcrumb(): boolean {
    const history = this.getHistory();
    console.log('history', history);

    // Need at least 2 items to have previousUrl and currentUrl
    if (history.length < 2) return false;

    const previousUrl = history[history.length - 2];
    const currentUrl = history[history.length - 1];

    // Guard against undefined (safety check)
    if (!previousUrl || !currentUrl) return false;

    // Don't append if it's the same URL (shouldn't happen due to addToHistory check, but keep for safety)
    if (previousUrl === currentUrl) return false;

    // Append if coming from search-results, collection, periodical, detail view, etc.
    const appendableRoutes = ['/search-results', '/collection/', '/periodical/', '/view/', '/music/'];
    return appendableRoutes.some(route => previousUrl.includes(route));
  }

  /**
   * Update the label of the last breadcrumb (useful for dynamic titles)
   */
  public updateLastBreadcrumbLabel(label: string): void {
    const breadcrumbs = [...this.breadcrumbs()];
    if (breadcrumbs.length > 0) {
      breadcrumbs[breadcrumbs.length - 1] = {
        ...breadcrumbs[breadcrumbs.length - 1],
        label
      };
      this.breadcrumbs.set(breadcrumbs);
    }
  }

  /**
   * Clear manual overrides
   */
  public clearOverrides(): void {
    this.manualOverrides.clear();
  }

  /**
   * Navigate to a breadcrumb
   */
  public navigateTo(breadcrumb: Breadcrumb): void {
    if (!breadcrumb.clickable) return;

    if (breadcrumb.queryParams) {
      this.router.navigate([breadcrumb.url], { queryParams: breadcrumb.queryParams });
    } else if (breadcrumb.url.includes('?')) {
      // URL already contains query params, use navigateByUrl to avoid double-encoding
      this.router.navigateByUrl(breadcrumb.url);
    } else {
      this.router.navigate([breadcrumb.url]);
    }
  }

  /**
   * Go back to previous page in history
   */
  public goBack(): void {
    if (this.navigationHistory.length > 1) {
      const previousUrl = this.navigationHistory[this.navigationHistory.length - 2];
      this.router.navigateByUrl(previousUrl);
    }
  }

  /**
   * Get navigation history
   */
  public getHistory(): string[] {
    return [...this.navigationHistory];
  }

  /**
   * Add URL to navigation history
   */
  private addToHistory(url: string): void {
    // Don't add if it's the same as the last entry
    if (this.navigationHistory[this.navigationHistory.length - 1] === url) {
      return;
    }

    this.navigationHistory.push(url);

    // Limit history size
    if (this.navigationHistory.length > this.MAX_HISTORY_SIZE) {
      this.navigationHistory.shift();
    }
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<BreadcrumbConfig>): void {
    this.config.set({
      ...this.config(),
      ...config
    });
  }
}
