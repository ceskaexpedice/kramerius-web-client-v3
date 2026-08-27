import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { AiPanelService } from './ai-panel.service';
import { AltoService } from './alto.service';
import { AiApiService } from './ai-api.service';
import { LocalStorageService } from './local-storage.service';

/**
 * Issue #161: the summary was always produced in the language of the original
 * text, which is useless to a reader who does not know that language, and the
 * old client offered a language choice that this one dropped.
 */
describe('AiPanelService summary language', () => {
  let service: AiPanelService;
  let askLLM: jasmine.Spy;
  let currentLang: string;

  /** Instructions passed to the model on the most recent summary request. */
  const lastInstructions = () => askLLM.calls.mostRecent().args[1] as string;

  function configure(uiLang: string): AiPanelService {
    currentLang = uiLang;
    askLLM = jasmine.createSpy('askLLM').and.returnValue(of('a summary'));

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        AiPanelService,
        { provide: AltoService, useValue: {
          fetchAltoXml: () => of('<alto/>'),
          getFullText: () => 'some page text',
        } },
        { provide: AiApiService, useValue: { askLLM, translate: () => of('') } },
        { provide: LocalStorageService, useValue: { get: () => null, set: () => {} } },
        { provide: TranslateService, useValue: {
          getCurrentLang: () => currentLang,
          getDefaultLang: () => 'cs',
        } },
      ],
    });
    return TestBed.inject(AiPanelService);
  }

  it('defaults the summary language to the UI language', () => {
    service = configure('en');
    expect(service.summaryLanguage()).toBe('en');
  });

  it('falls back to Czech when the UI language is not a supported target', () => {
    service = configure('xx');
    expect(service.summaryLanguage()).toBe('cs');
  });

  it('asks the model for the summary in the selected language', () => {
    service = configure('en');
    service.showSummary('uuid:page-1');

    expect(lastInstructions()).toContain('English');
    expect(lastInstructions()).toContain('en');
  });

  it('no longer pins the summary to the language of the original', () => {
    service = configure('en');
    service.showSummary('uuid:page-1');

    expect(lastInstructions()).not.toContain('same language as the original');
  });

  it('re-runs the summary when a different language is picked', () => {
    service = configure('cs');
    service.showSummary('uuid:page-1');
    const before = askLLM.calls.count();

    service.resummarize('de');

    expect(service.summaryLanguage()).toBe('de');
    expect(askLLM.calls.count()).toBeGreaterThan(before);
    expect(lastInstructions()).toContain('Deutsch');
  });

  it('ignores a language change when no page is open', () => {
    service = configure('cs');
    const before = askLLM.calls.count();

    service.resummarize('de');

    expect(askLLM.calls.count()).toBe(before);
  });

  it('keeps the chosen summary language after the panel is closed', () => {
    service = configure('cs');
    service.showSummary('uuid:page-1');
    service.resummarize('fr');

    service.close();

    expect(service.summaryLanguage()).toBe('fr');
  });

  it('keeps summary and translation languages independent', () => {
    service = configure('cs');
    service.showSummary('uuid:page-1');

    service.resummarize('de');

    // Picking a summary language must not silently retarget translation.
    expect(service.targetLanguage()).toBe('cs');
    expect(service.summaryLanguage()).toBe('de');
  });

});
