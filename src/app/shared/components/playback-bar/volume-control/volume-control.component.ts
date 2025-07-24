import {Component, EventEmitter, Input, Output, signal} from '@angular/core';

@Component({
  selector: 'app-volume-control',
  imports: [],
  templateUrl: './volume-control.component.html',
  styleUrl: './volume-control.component.scss'
})
export class VolumeControlComponent {

  @Input() volume = signal(1);

  @Output() volumeChange: EventEmitter<number> = new EventEmitter<number>();

  onVolumeChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const vol = parseFloat(input.value);
    this.volume.set(vol);
    this.volumeChange.emit(vol);
  }

  toggleMute() {
    if (this.volume() > 0) {
      this.volume.set(0);
    } else {
      this.volume.set(1); // or set to a default volume level
    }
    this.volumeChange.emit(this.volume());
  }

  getVolumeIcon() {
    // if volume is 0, return icon-volume-cross, if volume is between 0 and 0.5, return icon-volume-low, if volume is between 0.5 and 1, return icon-volume-high
    if (this.volume() === 0) {
      return 'icon-volume-cross';
    } else if (this.volume() > 0 && this.volume() <= 0.5) {
      return 'icon-volume-low';
    } else {
      return 'icon-volume-high';
    }
  }

}
