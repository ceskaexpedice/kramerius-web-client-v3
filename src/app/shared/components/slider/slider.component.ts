import { Component, EventEmitter, HostBinding, Input, Output } from '@angular/core';

@Component({
  selector: 'app-slider',
  standalone: true,
  imports: [],
  templateUrl: './slider.component.html',
  styleUrl: './slider.component.scss'
})
export class SliderComponent {
  @Input() value = 0;
  @Input() min = 0;
  @Input() max = 100;
  @Input() step = 1;
  @Input() ariaLabel = '';
  @Input() vertical = false;

  /** Turns the host into a size container so the rotated vertical track can read its length via `cqh`. */
  @HostBinding('class.slider--vertical-host')
  get isVerticalHost(): boolean {
    return this.vertical;
  }

  @Output() valueChange = new EventEmitter<number>();

  onInput(value: number): void {
    this.value = value;
    this.valueChange.emit(value);
  }

  /** Diameter of the slider thumb in px — must match the thumb size in the SCSS. */
  private static readonly THUMB_SIZE = 20;

  getSliderBackground(): string {
    const range = this.max - this.min;
    const pct = range > 0 ? ((this.value - this.min) / range) * 100 : 0;
    // The native thumb travels within (track − thumb), inset by half a thumb at
    // each end, so match the fill stop to the thumb centre to avoid an end gap.
    // The fill always runs along the track's own (horizontal) axis. In vertical
    // mode the whole track is rotated -90deg via CSS, so we keep the same
    // `to right` gradient here — the rotation gives it a top-to-bottom fill while
    // preserving the symmetric thumb inset of a horizontal slider.
    const half = SliderComponent.THUMB_SIZE / 2;
    const stop = `calc(${half}px + ${pct / 100} * (100% - ${SliderComponent.THUMB_SIZE}px))`;
    return `linear-gradient(
      to right,
      var(--color-primary) 0%,
      var(--color-primary) ${stop},
      var(--color-bg-light) ${stop},
      var(--color-bg-light) 100%
    )`;
  }
}
