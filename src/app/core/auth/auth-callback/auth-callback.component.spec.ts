import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { Store } from '@ngrx/store';
import { provideMockActions } from '@ngrx/effects/testing';
import { BehaviorSubject, Subject } from 'rxjs';
import { Action } from '@ngrx/store';
import { TranslateModule } from '@ngx-translate/core';
import { AuthCallbackComponent } from './auth-callback.component';
import { AuthService } from '../auth.service';
import * as AuthActions from '../store/auth.actions';

describe('AuthCallbackComponent', () => {
  let actions$: Subject<Action>;
  let queryParams$: BehaviorSubject<Record<string, string>>;
  let dispatched: Action[];

  function create(params: Record<string, string>) {
    actions$ = new Subject<Action>();
    queryParams$ = new BehaviorSubject(params);
    dispatched = [];

    TestBed.configureTestingModule({
      imports: [AuthCallbackComponent, TranslateModule.forRoot()],
      providers: [
        // The app runs zoneless; the view must update without zone.js here too.
        provideZonelessChangeDetection(),
        provideRouter([]),
        provideMockActions(() => actions$),
        { provide: ActivatedRoute, useValue: { queryParams: queryParams$ } },
        { provide: Store, useValue: { dispatch: (a: Action) => dispatched.push(a) } },
        {
          provide: AuthService,
          useValue: {
            hasValidToken: () => false,
            getOriginalRoute: () => null,
            clearOriginalRoute: () => {},
          },
        },
      ],
    });
    spyOn(window.history, 'replaceState');
    spyOn(console, 'error');
    const fixture = TestBed.createComponent(AuthCallbackComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('stops the spinner and shows the error when the token exchange fails', async () => {
    const fixture = create({ code: 'abc' });
    expect(dispatched.length).toBe(1);
    expect(fixture.componentInstance.loading()).toBeTrue();

    actions$.next(AuthActions.exchangeCodeForTokenFailure({ error: 'invalid_grant' }));
    // No manual detectChanges(): the view must update on its own.
    await fixture.whenStable();

    expect(fixture.componentInstance.loading()).toBeFalse();
    expect(fixture.componentInstance.failed()).toBeTrue();
    expect(fixture.nativeElement.querySelector('[role="alert"] button')).not.toBeNull();
  });

  it('never renders error_description from the URL', () => {
    const fixture = create({ error: 'access_denied', error_description: 'Call 900 123 456' });

    expect(fixture.componentInstance.failed()).toBeTrue();
    expect(fixture.nativeElement.textContent).not.toContain('Call 900 123 456');
  });
});
