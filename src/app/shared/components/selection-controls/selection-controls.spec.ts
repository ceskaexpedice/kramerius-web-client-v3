import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { SelectionControls } from './selection-controls';
import { ConfigService } from '../../../core/config';
import { DetailViewService } from '../../../modules/detail-view-page/services/detail-view.service';
import { UserService } from '../../services/user.service';
import { TtsService } from '../../services/tts.service';

describe('SelectionControls AI actions', () => {
  function setup(opts: { loggedIn?: boolean; aiFeature?: boolean; aiControl?: boolean; textAllowed?: boolean } = {}) {
    const { loggedIn = true, aiFeature = true, aiControl = true, textAllowed = true } = opts;
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [SelectionControls, TranslateModule.forRoot()],
      providers: [
        { provide: ConfigService, useValue: {
          isFeatureEnabled: () => aiFeature,
          isSelectionControlEnabled: (c: string) => c === 'ai' ? aiControl : true,
        } },
        { provide: DetailViewService, useValue: { isActionAllowed: () => textAllowed } },
        { provide: UserService, useValue: { isLoggedIn: loggedIn } },
        { provide: TtsService, useValue: { isReading: () => false } },
      ],
    });
    const fixture = TestBed.createComponent(SelectionControls);
    fixture.detectChanges();
    return fixture;
  }

  const aiButtons = (el: HTMLElement) => el.querySelectorAll('.icon-voice-square, .icon-translate, .icon-task-square').length;

  it('shows read, translate and summarise for a logged-in reader', () => {
    expect(aiButtons(setup().nativeElement)).toBe(3);
  });

  it('hides them when not logged in', () => {
    expect(aiButtons(setup({ loggedIn: false }).nativeElement)).toBe(0);
  });

  it('hides them when the licence denies working with the text', () => {
    expect(aiButtons(setup({ textAllowed: false }).nativeElement)).toBe(0);
  });

  it('hides them when AI is switched off', () => {
    expect(aiButtons(setup({ aiFeature: false }).nativeElement)).toBe(0);
    expect(aiButtons(setup({ aiControl: false }).nativeElement)).toBe(0);
  });

  it('emits the matching output for each button', () => {
    const fixture = setup();
    const c = fixture.componentInstance;
    const read = spyOn(c.read, 'emit');
    const translate = spyOn(c.translate, 'emit');
    const summarize = spyOn(c.summarize, 'emit');
    const el: HTMLElement = fixture.nativeElement;

    (el.querySelector('.icon-voice-square')!.parentElement as HTMLButtonElement).click();
    (el.querySelector('.icon-translate')!.parentElement as HTMLButtonElement).click();
    (el.querySelector('.icon-task-square')!.parentElement as HTMLButtonElement).click();

    expect(read).toHaveBeenCalled();
    expect(translate).toHaveBeenCalled();
    expect(summarize).toHaveBeenCalled();
  });
});
