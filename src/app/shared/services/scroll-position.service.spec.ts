import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { signal } from '@angular/core';
import { NavigationEnd, NavigationStart, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { KEEP_SCROLL_STATE, ScrollPositionService } from './scroll-position.service';

describe('ScrollPositionService', () => {
  let events: Subject<any>;
  let navigation: ReturnType<typeof signal<any>>;

  const navigate = (state?: Record<string, unknown>) => {
    navigation.set({ extras: { state } });
    events.next(new NavigationStart(1, '/search?group=false', 'imperative'));
    events.next(new NavigationEnd(1, '/search?group=false', '/search?group=false'));
    navigation.set(null);
    tick(0);
  };

  beforeEach(() => {
    events = new Subject<any>();
    navigation = signal<any>(null);
    TestBed.configureTestingModule({
      providers: [
        ScrollPositionService,
        { provide: Router, useValue: { events, url: '/search', currentNavigation: navigation } },
      ]
    });
    TestBed.inject(ScrollPositionService);
    spyOn(window, 'scrollTo');
  });

  it('scrolls to the top after a navigation', fakeAsync(() => {
    navigate();
    expect(window.scrollTo).toHaveBeenCalledWith(0, 0);
  }));

  it('keeps the position when the navigation asks for it', fakeAsync(() => {
    navigate({ [KEEP_SCROLL_STATE]: true });
    expect(window.scrollTo).not.toHaveBeenCalled();
  }));

  it('scrolls to the top again on the next ordinary navigation', fakeAsync(() => {
    navigate({ [KEEP_SCROLL_STATE]: true });
    navigate();
    expect(window.scrollTo).toHaveBeenCalledWith(0, 0);
  }));
});
