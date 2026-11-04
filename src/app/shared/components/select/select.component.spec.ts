import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { SelectComponent } from './select.component';

/**
 * The virtual option list must lay options out exactly `itemSize` apart. The
 * size used to be a fixed 36px, which only matched the default text size: with
 * the accessibility text scale the options grew taller and the list jumped.
 * The host scales the line height the way the accessibility setting does.
 */
@Component({
  standalone: true,
  imports: [SelectComponent],
  template: `
    <div style="--line-height-xs: 30px; width: 300px;">
      <app-select [options]="options" [virtualScroll]="true" [visibleItemsCount]="5"></app-select>
    </div>
  `,
})
class HostComponent {
  options = Array.from({ length: 100 }, (_, i) => `Option ${i}`);
}

describe('SelectComponent virtual list', () => {
  let fixture: ComponentFixture<HostComponent>;

  const frame = () => new Promise(resolve => requestAnimationFrame(() => resolve(null)));

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent, TranslateModule.forRoot()],
    }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  async function openSelect(): Promise<SelectComponent> {
    const select = fixture.debugElement.children[0].children[0].componentInstance as SelectComponent;
    select.toggle();
    for (let i = 0; i < 3; i++) {
      fixture.detectChanges();
      await frame();
      fixture.detectChanges();
      await fixture.whenStable();
    }
    return select;
  }

  it('sizes items from the rendered line height, not a fixed 36px', async () => {
    const select = await openSelect();

    // 30px line height + 10px top and bottom padding.
    expect(select.virtualItemSize).toBe(50);
    const options = Array.from(fixture.nativeElement.querySelectorAll('.option')) as HTMLElement[];
    expect(options.length).toBeGreaterThan(1);
    expect(options[1].getBoundingClientRect().top - options[0].getBoundingClientRect().top).toBeCloseTo(50, 1);
  });

  it('keeps the viewport at the visible item count', async () => {
    const select = await openSelect();

    expect(select.getViewportHeight()).toBe('250px');
  });
});
