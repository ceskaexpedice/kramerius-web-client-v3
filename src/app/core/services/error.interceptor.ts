import { inject } from '@angular/core';
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { APP_ROUTES_ENUM } from '../../app.routes';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Handle server errors (5xx)
      if (error.status >= 500 && error.status < 600) {
        router.navigate([APP_ROUTES_ENUM.SERVER_ERROR]);
      }

      // Handle not found errors (404)
      if (error.status === 404) {
        router.navigate([APP_ROUTES_ENUM.NOT_FOUND]);
      }

      return throwError(() => error);
    })
  );
};
