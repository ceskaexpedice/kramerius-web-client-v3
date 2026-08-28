import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { AppMissingTranslationService } from '../../translation/app-missing-translation-handler';
import { InputComponent } from './input.component';

/**
 * Both icon slots are `pointer-events: none` by default so clicks fall through to
 * the input; the `clickable-icon` class is what re-enables them, and it is applied
 * only when a click handler is actually bound (`prefixIconClick.observed`).
 *
 * Regression: the prefix icon emitted `prefixIconClick` but the SCSS defined
 * `.clickable-icon` only inside `.postfix-icon`, so the prefix icon stayed
 * pointer-transparent and its click never fired — the email-export dialog's
 * tap-to-unlock did nothing. These tests guard the class binding; the paired SCSS
 * rule lives in input.component.scss.
 */
@Component({
  standalone: true,
  imports: [InputComponent],
  template: `
    @if (withHandler) {
      <app-input [prefixIcon]="'icon-sms'" (prefixIconClick)="clicks = clicks + 1"></app-input>
    } @else {
      <app-input [prefixIcon]="'icon-sms'"></app-input>
    }
  `,
})
class HostComponent {
  withHandler = true;
  clicks = 0;
}

describe('InputComponent prefix icon click', () => {
  let fixture: ComponentFixture<HostComponent>;

  async function setup(withHandler: boolean) {
    await TestBed.configureTestingModule({
      imports: [HostComponent, TranslateModule.forRoot()],
      // InputComponent pulls in SpeechRecognitionService → AppTranslationService,
      // which needs the missing-translation handler.
      providers: [AppMissingTranslationService],
    }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.withHandler = withHandler;
    fixture.detectChanges();
    return fixture.nativeElement.querySelector('.prefix-icon') as HTMLElement;
  }

  it('marks the prefix icon clickable when a handler is bound', async () => {
    const icon = await setup(true);
    expect(icon).toBeTruthy();
    expect(icon.classList).toContain('clickable-icon');
  });

  it('leaves the prefix icon non-clickable when no handler is bound', async () => {
    const icon = await setup(false);
    expect(icon).toBeTruthy();
    expect(icon.classList).not.toContain('clickable-icon');
  });

  it('emits prefixIconClick when the icon is clicked', async () => {
    const icon = await setup(true);
    icon.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.clicks).toBe(1);
  });
});
