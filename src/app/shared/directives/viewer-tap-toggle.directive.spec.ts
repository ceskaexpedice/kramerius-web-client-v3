import { Component } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { BreakpointService } from '../services/breakpoint.service';
import { ViewerTapToggleDirective } from './viewer-tap-toggle.directive';

@Component({
  standalone: true,
  imports: [ViewerTapToggleDirective],
  template: `
    <div class="viewer" appViewerTapToggle (cleanTap)="taps = taps + 1" (gestureStart)="gestures = gestures + 1">
      <div class="page"></div>
    </div>
  `
})
class HostComponent {
  taps = 0;
  gestures = 0;
}

describe('ViewerTapToggleDirective', () => {
  let fixture: ComponentFixture<HostComponent>;
  let viewer: HTMLElement;
  let page: HTMLElement;

  const pointer = (target: EventTarget, type: string, pointerId: number, isPrimary: boolean, x = 100, y = 100) =>
    target.dispatchEvent(new PointerEvent(type, {
      pointerId, isPrimary, pointerType: 'touch', clientX: x, clientY: y,
      buttons: type === 'pointerup' || type === 'pointercancel' ? 0 : 1,
      bubbles: true, cancelable: true
    }));

  const tap = (target: EventTarget = page, pointerId = 1, x = 100, y = 100) => {
    pointer(target, 'pointerdown', pointerId, true, x, y);
    pointer(target, 'pointerup', pointerId, true, x, y);
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: BreakpointService, useValue: { isMobile: () => true } }]
    });
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    viewer = fixture.nativeElement.querySelector('.viewer');
    page = fixture.nativeElement.querySelector('.page');
  });

  it('emits a clean tap after the double-tap window', fakeAsync(() => {
    tap();
    expect(fixture.componentInstance.taps).toBe(0);
    tick(300);
    expect(fixture.componentInstance.taps).toBe(1);
  }));

  it('does not emit for a pinch', fakeAsync(() => {
    pointer(page, 'pointerdown', 1, true);
    pointer(page, 'pointerdown', 2, false, 200, 200);
    pointer(page, 'pointerup', 2, false, 220, 220);
    pointer(page, 'pointerup', 1, true);
    tick(300);
    expect(fixture.componentInstance.taps).toBe(0);
    expect(fixture.componentInstance.gestures).toBe(1);
  }));

  it('still taps after a pinch whose pointerup never reached the viewer (pdf.js re-renders pages mid-pinch)', fakeAsync(() => {
    pointer(page, 'pointerdown', 1, true);
    pointer(page, 'pointerdown', 2, false, 200, 200);
    // The page element under the second finger is replaced while zooming: its
    // pointerup lands outside the viewer.
    page.remove();
    pointer(document.body, 'pointerup', 2, false, 220, 220);
    pointer(viewer, 'pointerup', 1, true, 80, 80);
    tick(300);

    // Somewhere else on the screen than where the pinch started.
    tap(viewer, 3, 300, 400);
    tick(300);
    expect(fixture.componentInstance.taps).toBe(1);
  }));

  it('recovers when a pointer end was lost entirely', fakeAsync(() => {
    pointer(page, 'pointerdown', 1, true);
    pointer(page, 'pointerdown', 2, false, 200, 200);
    pointer(page, 'pointerup', 1, true, 80, 80);
    // No pointerup / pointercancel for pointer 2 at all.
    tick(300);

    tap(page, 3, 300, 400);
    tick(300);
    expect(fixture.componentInstance.taps).toBe(1);
  }));
});
