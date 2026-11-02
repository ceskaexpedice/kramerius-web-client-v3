import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TabsComponent } from './tabs.component';
import { TabItemComponent } from './tab-item.component';

@Component({
  imports: [TabsComponent, TabItemComponent],
  template: `
    <app-tabs variant="stacked" ariaLabel="Sections">
      <app-tab-item id="a" label="Alpha" icon="icon-a" [onlyIcon]="true">A content</app-tab-item>
      <app-tab-item id="b" label="Beta" icon="icon-b" [onlyIcon]="true" [badge]="'12'">B content</app-tab-item>
      <app-tab-item id="c" label="Gamma" icon="icon-c" [onlyIcon]="true">C content</app-tab-item>
    </app-tabs>
  `,
})
class HostComponent {}

describe('TabsComponent (WAI-ARIA tabs)', () => {
  let fixture: ComponentFixture<HostComponent>;
  let el: HTMLElement;

  beforeEach(() => {
    fixture = TestBed.configureTestingModule({ imports: [HostComponent] }).createComponent(HostComponent);
    fixture.detectChanges();
    fixture.detectChanges();
    el = fixture.nativeElement;
  });

  const tabs = () => Array.from(el.querySelectorAll<HTMLButtonElement>('[role=tab]'));

  it('exposes tablist / tab / tabpanel semantics', () => {
    const list = el.querySelector('[role=tablist]')!;
    expect(list.getAttribute('aria-label')).toBe('Sections');
    expect(tabs().length).toBe(3);
    expect(tabs()[0].getAttribute('aria-selected')).toBe('true');
    expect(tabs()[1].getAttribute('aria-selected')).toBe('false');
    const panel = el.querySelector('[role=tabpanel]')!;
    expect(tabs()[0].getAttribute('aria-controls')).toBe(panel.id);
    expect(panel.getAttribute('aria-labelledby')).toBe(tabs()[0].id);
  });

  it('uses a roving tabindex', () => {
    expect(tabs().map(t => t.getAttribute('tabindex'))).toEqual(['0', '-1', '-1']);
  });

  it('shows visible labels in the stacked variant (no icon-only tabs)', () => {
    expect(tabs().map(t => t.querySelector('.tab-button__label')?.textContent?.trim())).toEqual(['Alpha', 'Beta', 'Gamma']);
  });

  it('moves selection with arrow keys, Home and End', () => {
    const list = el.querySelector('[role=tablist]')!;
    const press = (key: string) => {
      list.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
      fixture.detectChanges();
    };
    press('ArrowRight');
    expect(tabs()[1].getAttribute('aria-selected')).toBe('true');
    expect(el.querySelector('[role=tabpanel]')!.textContent).toContain('B content');
    press('End');
    expect(tabs()[2].getAttribute('aria-selected')).toBe('true');
    press('ArrowRight');
    expect(tabs()[0].getAttribute('aria-selected')).toBe('true');
    press('ArrowLeft');
    expect(tabs()[2].getAttribute('aria-selected')).toBe('true');
    press('Home');
    expect(tabs()[0].getAttribute('aria-selected')).toBe('true');
  });

  it('renders the badge with a screen-reader text', () => {
    expect(tabs()[1].querySelector('.tab-button__badge')?.textContent).toContain('12');
    expect(tabs()[1].querySelector('.sr-only')?.textContent).toContain('12');
  });
});
