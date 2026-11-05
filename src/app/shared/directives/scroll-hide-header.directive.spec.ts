import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UiStateService } from '../services/ui-state.service';
import { ScrollHideHeaderDirective } from './scroll-hide-header.directive';

/** A phone page: two bars above a list that scrolls them away. */
@Component({
  standalone: true,
  imports: [ScrollHideHeaderDirective],
  template: `
    <div class="page" style="position: fixed; inset: 0; display: flex; flex-direction: column; overflow: hidden">
      <div class="bar-top" style="flex: 0 0 50px"></div>
      <div class="bar-sub" style="flex: 0 0 40px" [attr.data-scroll-hide-keep]="keep() ? '' : null"></div>
      <div class="list" [appScrollHideHeader]="enabled()" style="flex: 1; overflow: auto; padding-top: 8px">
        <div class="item" [style.height.px]="itemHeight()"></div>
      </div>
    </div>
  `
})
class HostComponent {
  enabled = signal(true);
  keep = signal(false);
  itemHeight = signal(3000);
}

describe('ScrollHideHeaderDirective', () => {
  let fixture: ComponentFixture<HostComponent>;
  let uiState: UiStateService;
  let now: number;

  const q = (sel: string) => fixture.nativeElement.querySelector(sel) as HTMLElement;

  const scrollTo = (top: number) => {
    const list = q('.list');
    list.scrollTop = top;
    list.dispatchEvent(new Event('scroll'));
    // Past the anti-flap cooldown before the next move.
    now += 1000;
  };

  /** Scrolls in small steps, as a drag would. */
  const scrollBy = (delta: number, step = 4) => {
    const list = q('.list');
    const target = list.scrollTop + delta;
    while (Math.abs(target - list.scrollTop) > 0) {
      const next = delta > 0 ? Math.min(target, list.scrollTop + step) : Math.max(target, list.scrollTop - step);
      list.scrollTop = next;
      list.dispatchEvent(new Event('scroll'));
    }
    now += 1000;
  };

  beforeEach(() => {
    now = 1_000_000;
    spyOn(Date, 'now').and.callFake(() => now);
    fixture = TestBed.createComponent(HostComponent);
    uiState = TestBed.inject(UiStateService);
    fixture.detectChanges();
    TestBed.tick();
  });

  afterEach(() => {
    fixture.destroy();
  });

  it('runs the list under the bars, padded so the content starts where it did', () => {
    const list = q('.list');
    const style = getComputedStyle(list);

    expect(style.position).toBe('fixed');
    expect(list.getBoundingClientRect().top).toBe(0);
    expect(style.paddingTop).toBe('98px');
    expect(q('.item').getBoundingClientRect().top).toBe(98);
    expect(q('.bar-top').classList).toContain('scroll-hide-chrome');
    expect(q('.bar-sub').classList).toContain('scroll-hide-chrome');
  });

  it('hides after scrolling down past the threshold and shows again on the way up', () => {
    scrollBy(60);
    expect(uiState.headerVisible()).toBeTrue();

    scrollBy(60);
    expect(uiState.headerVisible()).toBeFalse();
    expect(document.body.style.getPropertyValue('--scroll-hide-distance')).toBe('90px');

    scrollBy(-30);
    expect(uiState.headerVisible()).toBeFalse();

    scrollBy(-20);
    expect(uiState.headerVisible()).toBeTrue();
  });

  it('never moves the content when the bars slide (no layout change)', () => {
    scrollTo(300);
    const before = q('.item').getBoundingClientRect().top;

    scrollBy(100);
    fixture.detectChanges();

    expect(uiState.headerVisible()).toBeFalse();
    expect(q('.item').getBoundingClientRect().top).toBe(before - 100);
    expect(getComputedStyle(q('.list')).paddingTop).toBe('98px');
  });

  it('keeps a bar marked data-scroll-hide-keep at the screen top', () => {
    fixture.componentInstance.keep.set(true);
    fixture.detectChanges();

    scrollBy(150);
    fixture.detectChanges();

    expect(uiState.headerVisible()).toBeFalse();
    expect(document.body.style.getPropertyValue('--scroll-hide-distance')).toBe('50px');
    // Sticky children stick 50px higher, right under the kept bar.
    expect(q('.list').style.getPropertyValue('--scroll-hide-sticky-top')).toBe('-50px');
    expect(q('.list').style.scrollPaddingTop).toBe('40px');
  });

  it('keeps the bars on a list too short to fill the space they would free', () => {
    const list = q('.list');
    // Overflow by 120px: enough to pass the "near the top" zone and the
    // direction threshold, but short of the 98px of bars plus that threshold -
    // hiding them would leave an empty band above the content.
    const padding = parseFloat(getComputedStyle(list).paddingTop) + parseFloat(getComputedStyle(list).paddingBottom);
    fixture.componentInstance.itemHeight.set(list.clientHeight - padding + 120);
    fixture.detectChanges();
    expect(list.scrollHeight - list.clientHeight).toBe(120);

    scrollBy(120);

    expect(list.scrollTop).toBe(120);
    expect(uiState.headerVisible()).toBeTrue();
  });

  it('still hides on a list long enough to fill the freed space', () => {
    const list = q('.list');
    const padding = parseFloat(getComputedStyle(list).paddingTop) + parseFloat(getComputedStyle(list).paddingBottom);
    fixture.componentInstance.itemHeight.set(list.clientHeight - padding + 200);
    fixture.detectChanges();

    scrollBy(200);

    expect(uiState.headerVisible()).toBeFalse();
  });

  it('always shows the bars near the top of the list', () => {
    scrollBy(200);
    expect(uiState.headerVisible()).toBeFalse();

    scrollTo(20);
    expect(uiState.headerVisible()).toBeTrue();
  });

  it('restores the page when switched off', () => {
    scrollBy(200);
    fixture.componentInstance.enabled.set(false);
    fixture.detectChanges();

    const list = q('.list');
    expect(uiState.headerVisible()).toBeTrue();
    expect(list.getAttribute('style')).not.toContain('fixed');
    expect(getComputedStyle(list).paddingTop).toBe('8px');
    expect(q('.bar-top').classList).not.toContain('scroll-hide-chrome');
    expect(document.body.style.getPropertyValue('--scroll-hide-distance')).toBe('');
  });

  it('cleans up on destroy', () => {
    scrollBy(200);
    const bar = q('.bar-top');
    fixture.destroy();

    expect(uiState.headerVisible()).toBeTrue();
    expect(bar.classList).not.toContain('scroll-hide-chrome');
    expect(document.body.style.getPropertyValue('--scroll-hide-distance')).toBe('');
  });
});
