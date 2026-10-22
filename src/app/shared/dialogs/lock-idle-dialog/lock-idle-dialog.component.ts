import { Component, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { MatDialogRef } from '@angular/material/dialog';
import { LockService } from '../../services/lock.service';

/**
 * Warns a reader holding a lock license that the lock goes to the next reader
 * unless they show they are still there. Opened and closed by `AppComponent`
 * following `LockService.idleCountdown`; any input already counts as presence,
 * the button just makes that explicit.
 */
@Component({
  selector: 'app-lock-idle-dialog',
  imports: [TranslatePipe],
  templateUrl: './lock-idle-dialog.component.html',
  styleUrls: ['./lock-idle-dialog.component.scss', '../generic-dialog.scss'],
})
export class LockIdleDialogComponent {
  private dialogRef = inject(MatDialogRef<LockIdleDialogComponent>);
  protected lockService = inject(LockService);

  onContinue(): void {
    this.lockService.markActive();
    this.dialogRef.close();
  }
}
