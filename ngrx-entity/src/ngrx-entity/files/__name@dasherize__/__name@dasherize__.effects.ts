import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { of } from 'rxjs';
import * as <%= classify(name) %>Actions from './<%= dasherize(name) %>.actions';

@Injectable()
export class <%= classify(name) %>Effects {
  constructor(private actions$: Actions) {}

  load<%= classify(name) %>$ = createEffect(() =>
    this.actions$.pipe(
      ofType(<%= classify(name) %>Actions.load<%= classify(name) %>),
      switchMap(() => {
          return;
        },
        map(data => <%= classify(name) %>Actions.load<%= classify(name) %>Success({ data })),
        catchError(error => of(<%= classify(name) %>Actions.load<%= classify(name) %>Failure({ error })))
      )
    )
  )
);
}
