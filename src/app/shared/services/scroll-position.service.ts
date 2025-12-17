import { Injectable, NgZone } from '@angular/core';
import { Router, NavigationEnd, NavigationStart } from '@angular/router';
import { ViewportScroller } from '@angular/common';
import { filter, throttleTime } from 'rxjs/operators';
import { fromEvent } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ScrollPositionService {
  private scrollPositions = new Map<string, number>();
  private isNavigatingBack = false;
  private pendingScrollRestoration: string | null = null;
  private scrollSubscription: any = null;

  constructor(
    private router: Router,
    private viewportScroller: ViewportScroller,
    private ngZone: NgZone
  ) {
    this.initializeScrollRestoration();
  }

  private getScrollContainer(): Element | null {
    return document.querySelector('.page-content__wrapper');
  }

  private saveCurrentScrollPosition(): void {
    const currentUrl = this.router.url;
    const scrollContainer = this.getScrollContainer();
    const scrollPosition = scrollContainer ? scrollContainer.scrollTop : (window.scrollY || document.documentElement.scrollTop);
    this.scrollPositions.set(currentUrl, scrollPosition);
  }

  private initializeScrollRestoration(): void {
    // Save scroll position periodically as user scrolls
    this.ngZone.runOutsideAngular(() => {
      const setupScrollListener = () => {
        if (this.scrollSubscription) {
          this.scrollSubscription.unsubscribe();
        }

        const scrollContainer = this.getScrollContainer();
        const target = scrollContainer || window;

        this.scrollSubscription = fromEvent(target, 'scroll')
          .pipe(throttleTime(100))
          .subscribe(() => {
            this.saveCurrentScrollPosition();
          });
      };

      setupScrollListener();

      this.router.events.pipe(
        filter(event => event instanceof NavigationEnd)
      ).subscribe(() => {
        setTimeout(() => setupScrollListener(), 100);
      });
    });

    this.router.events.pipe(
      filter(event => event instanceof NavigationStart)
    ).subscribe((event: NavigationStart) => {
      this.saveCurrentScrollPosition();
      this.isNavigatingBack = event.navigationTrigger === 'popstate';
    });

    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      if (this.isNavigatingBack) {
        this.restoreScrollPosition(event.urlAfterRedirects);
      } else {
        setTimeout(() => {
          const scrollContainer = this.getScrollContainer();
          if (scrollContainer) {
            scrollContainer.scrollTop = 0;
          } else {
            window.scrollTo(0, 0);
          }
        }, 0);
      }
      this.isNavigatingBack = false;
    });
  }

  private restoreScrollPosition(url: string): void {
    const savedPosition = this.scrollPositions.get(url);

    if (savedPosition !== undefined) {
      this.pendingScrollRestoration = url;

      setTimeout(() => {
        if (this.pendingScrollRestoration === url) {
          this.performScrollRestoration(url, savedPosition);
        }
      }, 1000);
    }
  }

  private performScrollRestoration(url: string, savedPosition: number): void {
    requestAnimationFrame(() => {
      const scrollContainer = this.getScrollContainer();
      if (scrollContainer) {
        scrollContainer.scrollTop = savedPosition;
      } else {
        window.scrollTo(0, savedPosition);
      }
    });
    this.pendingScrollRestoration = null;
  }

  public notifyContentLoaded(): void {
    if (this.pendingScrollRestoration) {
      const url = this.pendingScrollRestoration;
      const savedPosition = this.scrollPositions.get(url);

      if (savedPosition !== undefined) {
        this.performScrollRestoration(url, savedPosition);
      } else {
        this.pendingScrollRestoration = null;
      }
    }
  }

  public clearScrollPosition(url: string): void {
    this.scrollPositions.delete(url);
  }

  public clearAllScrollPositions(): void {
    this.scrollPositions.clear();
  }
}
