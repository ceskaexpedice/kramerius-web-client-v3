import {inject, Injectable} from '@angular/core';
import {MatSnackBar, MatSnackBarHorizontalPosition, MatSnackBarVerticalPosition} from '@angular/material/snack-bar';
import {TranslateService} from '@ngx-translate/core';

@Injectable({
  providedIn: 'root',
})
export class ToastService {

  private _snackBar = inject(MatSnackBar);
  private _translateService = inject(TranslateService);

  show(message: string, action: string | null = null, duration: number = 5000, horizontalPosition: MatSnackBarHorizontalPosition = 'center', verticalPosition: MatSnackBarVerticalPosition = 'bottom'): void {
    this._snackBar.open(
      this._translateService.instant(message),
      action ? this._translateService.instant(action) : null,
      {
        duration: duration,
        horizontalPosition: horizontalPosition,
        verticalPosition: verticalPosition,
        panelClass: ['toast'],
      });
  }
}
