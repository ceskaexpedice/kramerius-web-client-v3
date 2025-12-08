import { inject } from '@angular/core';
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { APP_ROUTES_ENUM } from '../../app.routes';
import { ErrorDialogService } from '../../shared/services/error-dialog.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const errorDialogService = inject(ErrorDialogService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Handle server errors (5xx) - show dialog instead of navigating
      if (error.status >= 500 && error.status < 600) {
        errorDialogService.openServerErrorDialog();
      }

      // Handle network errors and CORS issues (status 0)
      if (error.status === 0) {
        errorDialogService.openServerErrorDialog();
      }

      // Handle not found errors (404) - show 404 page without changing URL
      if (error.status === 404) {
        router.navigate([APP_ROUTES_ENUM.NOT_FOUND], { skipLocationChange: true });
      }

      return throwError(() => error);
    })
  );
};
