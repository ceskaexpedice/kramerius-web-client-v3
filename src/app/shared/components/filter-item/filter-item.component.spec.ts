import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { FilterItemComponent } from './filter-item.component';
import { AppMissingTranslationService } from '../../translation/app-missing-translation-handler';

/**
 * Document-type facets show the type's colour AND its icon: colour alone was
 * ambiguous between the several purple/teal-ish types. The template branches are
 * ordered — `colorDot && icon` must win over the `colorDot`-only branch, otherwise
 * the icon silently disappears behind the plain dot (which is how this started).
 */
describe('FilterItemComponent type marker', () => {
  async function render(inputs: Partial<{ colorDot: string; icon: string; langCode: string }>) {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [FilterItemComponent, TranslateModule.forRoot()],
      providers: [AppMissingTranslationService],
    }).compileComponents();

    const fixture = TestBed.createComponent(FilterItemComponent);
    fixture.componentRef.setInput('label', 'monograph');
    fixture.componentRef.setInput('count', 1);
    for (const [key, value] of Object.entries(inputs)) {
      fixture.componentRef.setInput(key, value);
    }
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('renders a coloured tile containing the icon when both are set', async () => {
    const el = await render({ colorDot: 'var(--color-bg-tag-monograph)', icon: 'icon-book-1' });
    const tile = el.querySelector('.model-tile');
    expect(tile).withContext('model tile should be rendered').toBeTruthy();
    expect(tile!.querySelector('i')?.classList).toContain('icon-book-1');
    // The plain dot must not also render — they are alternative markers.
    expect(el.querySelector('.color-dot')).toBeNull();
  });

  it('falls back to the plain dot when the type has no icon', async () => {
    const el = await render({ colorDot: 'var(--color-bg-tag-page)' });
    expect(el.querySelector('.color-dot')).toBeTruthy();
    expect(el.querySelector('.model-tile')).toBeNull();
  });

  it('renders a bare icon when there is no colour', async () => {
    const el = await render({ icon: 'icon-book-1' });
    expect(el.querySelector('.icon')).toBeTruthy();
    expect(el.querySelector('.model-tile')).toBeNull();
  });
});
