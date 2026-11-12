import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CdkTooltipDirective } from './cdk-tooltip.directive';

@Component({
  standalone: true,
  imports: [CdkTooltipDirective],
  template: `<button appCdkTooltip="Zoom in" title="Zoom in" [tooltipShowDelay]="0">+</button>`,
})
class HostComponent {}

describe('CdkTooltipDirective native title', () => {
  function setup() {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    return fixture.nativeElement.querySelector('button') as HTMLButtonElement;
  }

  it('keeps title in the markup while idle', () => {
    expect(setup().getAttribute('title')).toBe('Zoom in');
  });

  it('removes title while hovered so the browser does not show a second tooltip', () => {
    const btn = setup();
    btn.dispatchEvent(new MouseEvent('mouseenter'));
    expect(btn.hasAttribute('title')).toBe(false);
  });

  it('keeps title parked after a click while the pointer is still over the button', () => {
    const btn = setup();
    btn.dispatchEvent(new MouseEvent('mouseenter'));
    btn.dispatchEvent(new MouseEvent('click'));
    expect(btn.hasAttribute('title')).toBe(false);
  });

  it('restores title on mouseleave', () => {
    const btn = setup();
    btn.dispatchEvent(new MouseEvent('mouseenter'));
    btn.dispatchEvent(new MouseEvent('mouseleave'));
    expect(btn.getAttribute('title')).toBe('Zoom in');
  });

  it('prefers a title re-set by a binding over the parked one', () => {
    const btn = setup();
    btn.dispatchEvent(new MouseEvent('mouseenter'));
    btn.setAttribute('title', 'Zoom out');
    btn.dispatchEvent(new MouseEvent('mouseleave'));
    expect(btn.getAttribute('title')).toBe('Zoom out');
  });
});
