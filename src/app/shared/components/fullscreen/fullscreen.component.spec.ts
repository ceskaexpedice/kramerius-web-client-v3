import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';

import { FullscreenComponent } from './fullscreen.component';

/**
 * Regression coverage for issue #162: on iOS (every browser there is WebKit,
 * Chrome included) no element-level Fullscreen API exists, so the component
 * used to flip into "fullscreen" and show a close button over a page whose
 * layout never changed.
 */
describe('FullscreenComponent', () => {
  let component: FullscreenComponent;
  let fixture: ComponentFixture<FullscreenComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FullscreenComponent, TranslateModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(FullscreenComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  /** Replaces the container element with one exposing the given API surface. */
  function setContainerApi(methods: Record<string, unknown>): void {
    component.containerRef = { nativeElement: methods } as any;
  }

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('when the browser has no element Fullscreen API (iOS)', () => {
    beforeEach(() => {
      // No requestFullscreen / webkitRequestFullscreen / msRequestFullscreen.
      setContainerApi({});
    });

    it('reports fullscreen as unsupported', () => {
      expect(component.isFullscreenSupported).toBe(false);
    });

    it('falls back to CSS fullscreen instead of doing nothing', () => {
      component.toggle();

      expect(component.isCssFallback).toBe(true);
      expect(component.isFullscreen).toBe(true);
    });

    it('applies the fallback class so the container is pinned over the page', () => {
      component.toggle();
      fixture.detectChanges();

      const container = fixture.nativeElement.querySelector('.fullscreen-container');
      expect(container.classList).toContain('fullscreen-fallback');
    });

    it('locks page scrolling while the fallback is active, and releases it', () => {
      component.toggle();
      expect(document.body.style.overflow).toBe('hidden');

      component.toggle();
      expect(document.body.style.overflow).toBe('');
    });

    it('renders the close button so the fallback can be dismissed', () => {
      component.toggle();
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.fullscreen-close-button')).not.toBeNull();
    });

    it('leaves the fallback and notifies the host on exit', () => {
      component.toggle();

      const emitted: boolean[] = [];
      component.fullscreenChange.subscribe(v => emitted.push(v));
      component.toggle();

      expect(component.isCssFallback).toBe(false);
      expect(component.isFullscreen).toBe(false);
      expect(emitted).toEqual([false]);
    });

    it('releases the scroll lock when destroyed mid-fallback', () => {
      component.toggle();
      expect(document.body.style.overflow).toBe('hidden');

      fixture.destroy();

      expect(document.body.style.overflow).toBe('');
    });
  });

  describe('when the browser supports element fullscreen', () => {
    it('enters fullscreen and emits once', () => {
      const requestFullscreen = jasmine.createSpy('requestFullscreen').and.returnValue(Promise.resolve());
      setContainerApi({ requestFullscreen });

      const emitted: boolean[] = [];
      component.fullscreenChange.subscribe(v => emitted.push(v));

      component.toggle();

      expect(requestFullscreen).toHaveBeenCalled();
      expect(component.isFullscreen).toBe(true);
      expect(emitted).toEqual([true]);
    });

    it('never uses the CSS fallback when the native API exists', () => {
      setContainerApi({ requestFullscreen: () => Promise.resolve() });

      component.toggle();

      expect(component.isCssFallback).toBe(false);
      expect(document.body.style.overflow).toBe('');
    });

    it('is supported even when document.fullscreenEnabled is falsy (Android regression)', () => {
      // Gating on document.fullscreenEnabled hid the control on Android, where
      // element fullscreen actually works. Only the request method matters.
      setContainerApi({ webkitRequestFullscreen: () => undefined });

      expect(component.isFullscreenSupported).toBe(true);
    });

    it('uses the webkit-prefixed request method when that is all there is', () => {
      const webkitRequestFullscreen = jasmine.createSpy('webkitRequestFullscreen');
      setContainerApi({ webkitRequestFullscreen });

      component.toggle();

      expect(webkitRequestFullscreen).toHaveBeenCalled();
      expect(component.isFullscreen).toBe(true);
    });

    it('rolls the state back when the request is rejected', async () => {
      const rejection = Promise.reject(new Error('gesture expired'));
      setContainerApi({ requestFullscreen: () => rejection });

      const emitted: boolean[] = [];
      component.fullscreenChange.subscribe(v => emitted.push(v));

      component.toggle();
      await rejection.catch(() => undefined);
      // Let the component's own catch handler run.
      await Promise.resolve();

      expect(component.isFullscreen).toBe(false);
      expect(emitted).toEqual([true, false]);
    });

    it('notifies the host when exiting while the document is already out of fullscreen', () => {
      setContainerApi({ requestFullscreen: () => Promise.resolve() });
      component.toggle();

      const emitted: boolean[] = [];
      component.fullscreenChange.subscribe(v => emitted.push(v));

      // document.fullscreenElement is null in the test harness, so this takes
      // the "already exited" path, which previously reset state silently.
      component.toggle();

      expect(component.isFullscreen).toBe(false);
      expect(emitted).toEqual([false]);
    });
  });
});
