import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { HttpClient } from '@angular/common/http';
import { EmailExportDialogComponent } from './email-export-dialog.component';
import { EnvironmentService } from '../../services/environment.service';
import { UserService } from '../../services/user.service';
import { ConfigService } from '../../../core/config/config.service';

/**
 * Exports may only be delivered to the address the IdP provides (decision of
 * 2026-08-27): the recipient field is prefilled from the session and locked, so a
 * user cannot redirect an export elsewhere. Testers still need to route an export to
 * their own mailbox, which tapping the envelope icon ten times allows.
 */
describe('EmailExportDialogComponent recipient locking', () => {
  function build(sessionEmail: string | null) {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        EmailExportDialogComponent,
        { provide: MatDialogRef, useValue: { close: () => {} } },
        { provide: MAT_DIALOG_DATA, useValue: { pid: 'uuid:1', exportType: 'pdf' } },
        { provide: UserService, useValue: { userSession$: () => ({ email: sessionEmail }) } },
        { provide: EnvironmentService, useValue: { getBaseApiUrl: () => '' } },
        { provide: HttpClient, useValue: { post: () => ({ subscribe: () => {} }) } },
        { provide: ConfigService, useValue: { isEnrichWithAIEnabled: () => false } },
      ],
    });
    return TestBed.inject(EmailExportDialogComponent);
  }

  function click(c: EmailExportDialogComponent, times: number) {
    for (let i = 0; i < times; i++) c.onEmailIconClick();
  }

  it('prefills the IdP address and starts locked', () => {
    const c = build('user@knav.cz');
    expect(c.email).toBe('user@knav.cz');
    expect(c.emailLocked()).toBe(true);
  });

  it('stays locked after nine icon clicks', () => {
    const c = build('user@knav.cz');
    click(c, 9);
    expect(c.emailLocked()).toBe(true);
  });

  it('unlocks on the tenth icon click', () => {
    const c = build('user@knav.cz');
    click(c, 10);
    expect(c.emailLocked()).toBe(false);
  });

  it('stays unlocked on further clicks (the counter cannot wrap around)', () => {
    const c = build('user@knav.cz');
    click(c, 25);
    expect(c.emailLocked()).toBe(false);
  });

  it('keeps the prefilled address when unlocking', () => {
    const c = build('user@knav.cz');
    click(c, 10);
    expect(c.email).toBe('user@knav.cz');
  });

  it('still validates the address the tester types after unlocking', () => {
    const c = build('user@knav.cz');
    click(c, 10);
    c.onEmailChange('not-an-email');
    c.onSubmit();
    expect(c.emailInvalid()).toBe(true);
  });
});
