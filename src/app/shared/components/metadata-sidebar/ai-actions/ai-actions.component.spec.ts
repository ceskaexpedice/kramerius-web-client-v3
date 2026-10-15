import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AiActionsComponent } from './ai-actions.component';
import { TtsService } from '../../../services/tts.service';
import { AiPanelService } from '../../../services/ai-panel.service';
import { DetailViewService } from '../../../../modules/detail-view-page/services/detail-view.service';
import { UserService } from '../../../services/user.service';
import { SettingsService } from '../../../../modules/settings/settings.service';
import { DocumentInfoService } from '../../../services/document-info.service';
import { ConfigService } from '../../../../core/config/config.service';

/**
 * Read-aloud, translation and summarisation need the page's words, not their
 * coordinates, and `AltoService` falls back to `/ocr/text` when a page has no
 * ALTO. Gating them on ALTO alone therefore disabled them on pages whose text
 * was available all along — the NKP copy of a CDK document being a real case.
 */
describe('AiActionsComponent OCR availability', () => {
  function setup(ocr: { alto: boolean; text: boolean }, textAllowed = true) {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: TtsService, useValue: {} },
        { provide: AiPanelService, useValue: {} },
        { provide: DetailViewService, useValue: {} },
        { provide: UserService, useValue: { isLoggedIn: true } },
        { provide: SettingsService, useValue: {} },
        { provide: Router, useValue: { url: '/view/x' } },
        {
          provide: DocumentInfoService,
          useValue: { hasAlto: () => ocr.alto, hasOcrText: () => ocr.text, getRuntimeLicenses: () => [] },
        },
        {
          provide: ConfigService,
          useValue: { getLicenseConfig: () => ({ actions: { text: textAllowed } }) },
        },
      ],
    });
    return TestBed.runInInjectionContext(() => new AiActionsComponent());
  }

  it('enables the actions when the page has ALTO', () => {
    expect(setup({ alto: true, text: true }).actionsDisabled).toBe(false);
  });

  it('enables the actions on a page with OCR text but no ALTO', () => {
    expect(setup({ alto: false, text: true }).actionsDisabled).toBe(false);
  });

  it('disables the actions when the page has no OCR at all', () => {
    expect(setup({ alto: false, text: false }).actionsDisabled).toBe(true);
  });

  it('still defers to the licence when text is forbidden', () => {
    const c = setup({ alto: true, text: true }, false);
    // getRuntimeLicenses() returns [] above, so give it one to evaluate.
    (c as any).documentInfoService.getRuntimeLicenses = () => ['dnnto'];
    expect(c.actionsDisabled).toBe(true);
  });
});
