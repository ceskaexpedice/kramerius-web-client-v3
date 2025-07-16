import {Component, EventEmitter, inject, Output} from '@angular/core';
import {TranslatePipe} from '@ngx-translate/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {MatCheckbox} from '@angular/material/checkbox';

export type PlaybackStopResult = 'stop' | 'close';

@Component({
  selector: 'app-playback-stop-dialog',
  imports: [
    TranslatePipe,
    MatCheckbox
  ],
  templateUrl: './playback-stop-dialog.component.html',
  styleUrls: ['./playback-stop-dialog.component.scss', '../generic-dialog.scss'],
})
export class PlaybackStopDialogComponent {
  @Output() close = new EventEmitter<PlaybackStopResult>();

  private dialogRef = inject(MatDialogRef<PlaybackStopDialogComponent>, { optional: true });
  data = inject<any>(MAT_DIALOG_DATA);

  onStop(result: PlaybackStopResult) {
    this.close.emit(result);
    this.dialogRef?.close(result);
  }

  onClose(result: PlaybackStopResult = 'close') {
    this.close.emit(result);
    this.dialogRef?.close(result);
  }
}
