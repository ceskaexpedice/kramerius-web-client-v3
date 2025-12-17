import {Component, EventEmitter, inject, Output} from '@angular/core';
import {TranslatePipe} from '@ngx-translate/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {MatCheckbox} from '@angular/material/checkbox';
import {FormsModule} from '@angular/forms';
import {DontShowAgainService, DontShowDialogs} from '../../services/dont-show-again.service';

export type PlaybackStopResult = 'stop' | 'close';

@Component({
  selector: 'app-playback-stop-dialog',
  imports: [
    TranslatePipe,
    MatCheckbox,
    FormsModule
  ],
  templateUrl: './playback-stop-dialog.component.html',
  styleUrls: ['./playback-stop-dialog.component.scss', '../generic-dialog.scss'],
})
export class PlaybackStopDialogComponent {
  @Output() close = new EventEmitter<PlaybackStopResult>();

  private dialogRef = inject(MatDialogRef<PlaybackStopDialogComponent>, { optional: true });
  private dontShowAgainService = inject(DontShowAgainService);
  data = inject<any>(MAT_DIALOG_DATA);

  dontShowAgain = false;

  onStop(result: PlaybackStopResult) {
    this.handleDialogAction(result);
  }

  onClose(result: PlaybackStopResult = 'close') {
    this.handleDialogAction(result);
  }

  private handleDialogAction(result: PlaybackStopResult) {
    if (this.dontShowAgain) {
      this.dontShowAgainService.setDontShowAgain(DontShowDialogs.PlaybackStopDialog);
    }

    this.close.emit(result);
    this.dialogRef?.close(result);
  }
}
