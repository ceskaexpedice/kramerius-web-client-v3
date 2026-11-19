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

/**
 * Regression (testing 2.11.): the non-autocomplete <input> had a hardcoded
 * `inputmode="numeric"`, so every text field — e.g. search in a saved list —
 * opened the digits-only keypad on iOS, with no Return key to submit.
 */
@Component({
  standalone: true,
  imports: [InputComponent],
  template: `<app-input [type]="type" [inputMode]="inputMode" [enterKeyHint]="enterKeyHint"></app-input>`,
})
class KeyboardHostComponent {
  type = 'text';
  inputMode: string | null = null;
  enterKeyHint: string | null = null;
}

describe('InputComponent virtual keyboard hints', () => {
  async function render(props: Partial<KeyboardHostComponent>) {
    await TestBed.configureTestingModule({
      imports: [KeyboardHostComponent, TranslateModule.forRoot()],
      providers: [AppMissingTranslationService],
    }).compileComponents();
    const fixture = TestBed.createComponent(KeyboardHostComponent);
    Object.assign(fixture.componentInstance, props);
    fixture.detectChanges();
    return fixture.nativeElement.querySelector('input') as HTMLInputElement;
  }

  it('does not force the numeric keypad on text inputs', async () => {
    const input = await render({ type: 'text' });
    expect(input.getAttribute('inputmode')).toBeNull();
  });

  it('uses the numeric keypad for number inputs', async () => {
    const input = await render({ type: 'number' });
    expect(input.getAttribute('inputmode')).toBe('numeric');
  });

  it('honours an explicit inputMode and enterKeyHint', async () => {
    const input = await render({ type: 'text', inputMode: 'numeric', enterKeyHint: 'search' });
    expect(input.getAttribute('inputmode')).toBe('numeric');
    expect(input.getAttribute('enterkeyhint')).toBe('search');
  });
});

/**
 * Regression (testing 13.11.): search in a saved list did nothing when the
 * phone keyboard's "Search" key was pressed — mobile keyboards don't reliably
 * send a `keyup` for Return, which is what `(enter)` listened to.
 */
@Component({
  standalone: true,
  imports: [InputComponent],
  template: `<app-input [type]="'text'" (enter)="entered.push($event)"></app-input>`,
})
class EnterHostComponent {
  entered: (string | number)[] = [];
}

describe('InputComponent enter', () => {
  async function render() {
    await TestBed.configureTestingModule({
      imports: [EnterHostComponent, TranslateModule.forRoot()],
      providers: [AppMissingTranslationService],
    }).compileComponents();
    const fixture = TestBed.createComponent(EnterHostComponent);
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    return { fixture, input };
  }

  function press(input: HTMLInputElement, type: 'keydown' | 'keyup', init: KeyboardEventInit = {}) {
    input.dispatchEvent(new KeyboardEvent(type, { key: 'Enter', bubbles: true, ...init }));
  }

  it('emits on keydown Enter with the current DOM value, without needing keyup', async () => {
    const { fixture, input } = await render();
    input.value = '1978'; // value not yet synced through ngModel
    press(input, 'keydown');
    expect(fixture.componentInstance.entered).toEqual(['1978']);
  });

  it('does not emit a second time on the following keyup', async () => {
    const { fixture, input } = await render();
    input.value = 'x';
    press(input, 'keydown');
    press(input, 'keyup');
    expect(fixture.componentInstance.entered.length).toBe(1);
  });

  it('prevents the default action so the key press cannot activate a newly focused button', async () => {
    const { input } = await render();
    const ev = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    input.dispatchEvent(ev);
    expect(ev.defaultPrevented).toBeTrue();
  });

  it('ignores Enter that only commits an IME composition', async () => {
    const { fixture, input } = await render();
    press(input, 'keydown', { isComposing: true });
    expect(fixture.componentInstance.entered).toEqual([]);
  });
});
