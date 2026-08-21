import { Component, ElementRef, EventEmitter, Input, NgZone, OnDestroy, Output, ViewChild, inject, signal } from '@angular/core';
import { Language } from '../../translation/lang-picker/language';
import { ClickOutsideDirective } from '../../directives/click-outside';
import { LanguageBadgeComponent } from '../language-badge/language-badge.component';
import { TranslatePipe } from '@ngx-translate/core';

interface DropdownMeasurements {
  trigger: DOMRect;
  dropdownWidth: number;
  dropdownHeight: number;
  viewportWidth: number;
  viewportHeight: number;
}

@Component({
  selector: 'app-language-select',
  standalone: true,
  imports: [ClickOutsideDirective, LanguageBadgeComponent, TranslatePipe],
  templateUrl: './language-select.component.html',
  styleUrl: './language-select.component.scss'
})
export class LanguageSelectComponent implements OnDestroy {
  private ngZone = inject(NgZone);
  private dropdownObserver: ResizeObserver | null = null;

  @Input({ required: true }) languages: Language[] = [];
  @Input() selectedCode: string | null = null;
  @Input() label: string | null = null;
  @Input() dropdownFixed: boolean = true;
  @Output() langChange = new EventEmitter<string>();

  @ViewChild('trigger') trigger?: ElementRef<HTMLElement>;
  private _dropdown?: ElementRef<HTMLElement>;
  @ViewChild('dropdown')
  set dropdown(ref: ElementRef<HTMLElement> | undefined) {
    this._dropdown = ref;
    // Fires the moment @if creates (or destroys) the dropdown, which is the
    // earliest point its real size can be read.
    if (ref) {
      this.observeDropdown(ref.nativeElement);
    } else {
      this.dropdownObserver?.disconnect();
      this.dropdownObserver = null;
    }
  }
  get dropdown(): ElementRef<HTMLElement> | undefined {
    return this._dropdown;
  }

  /** Minimum gap kept between the dropdown and the viewport edges. */
  private static readonly VIEWPORT_MARGIN = 8;

  expanded = false;
  dropdownTop = 0;
  dropdownRight = 0;
  /** Clamps applied only when the stylesheet's own size would overflow. */
  dropdownMaxWidth: number | null = null;
  dropdownMaxHeight: number | null = null;

  get selected(): Language | undefined {
    return this.languages.find(l => l.code === this.selectedCode) || this.languages[0];
  }

  toggle() {
    if (!this.expanded) {
      // Position from the trigger first so the very first paint is already close
      // to correct, then refine from the rendered element's real size.
      this.updatePosition();
      this.expanded = true;
      return;
    }
    this.expanded = false;
  }

  private observeDropdown(el: HTMLElement): void {
    this.dropdownObserver?.disconnect();
    // The dropdown's size is content-driven; observing it covers both the
    // initial measurement and any later reflow (font loading, language list).
    this.dropdownObserver = new ResizeObserver(() => {
      this.ngZone.run(() => this.applyPosition(this.measure(el)));
    });
    this.dropdownObserver.observe(el);
  }

  close() {
    if (this.expanded) {
      this.expanded = false;
      this.dropdownObserver?.disconnect();
      this.dropdownObserver = null;
    }
  }

  pick(code: string) {
    this.expanded = false;
    this.dropdownObserver?.disconnect();
    this.dropdownObserver = null;
    if (code !== this.selectedCode) {
      this.langChange.emit(code);
    }
  }

  /**
   * Reads the geometry positioning depends on. DOM reads only — this runs in the
   * `earlyRead` phase, before any write.
   */
  private measure(dropdown?: HTMLElement | null): DropdownMeasurements | null {
    const el = this.trigger?.nativeElement;
    if (!el) return null;

    // Before the dropdown exists there is nothing to measure, but its intended
    // size is declared in the stylesheet as custom properties. Reading those
    // lets the very first paint already be clamped to the viewport, instead of
    // rendering off-screen and visibly correcting itself (issue #161).
    const declared = getComputedStyle(el);
    const declaredWidth = parseFloat(declared.getPropertyValue('--lang-dropdown-width')) || 0;
    const declaredHeight = parseFloat(declared.getPropertyValue('--lang-dropdown-max-height')) || 0;

    return {
      trigger: el.getBoundingClientRect(),
      dropdownWidth: dropdown?.offsetWidth || declaredWidth,
      dropdownHeight: dropdown?.offsetHeight || declaredHeight,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
    };
  }

  /**
   * Right-aligns the dropdown to its trigger, then keeps it inside the viewport.
   * Sizes come from the rendered element rather than being duplicated from the
   * stylesheet, so restyling the dropdown cannot silently break positioning.
   * Without the clamp a trigger near the left edge — as in the AI toolbar —
   * pushes the panel off-screen (issue #161).
   */
  private applyPosition(m: DropdownMeasurements | null): void {
    if (!m) return;

    const margin = LanguageSelectComponent.VIEWPORT_MARGIN;
    const { trigger: rect, dropdownWidth: width, dropdownHeight: height, viewportWidth, viewportHeight } = m;

    const availableWidth = viewportWidth - margin * 2;
    this.dropdownMaxWidth = width > availableWidth ? availableWidth : null;
    const effectiveWidth = Math.min(width, availableWidth);

    const preferredRight = viewportWidth - rect.right;
    const maxRight = viewportWidth - effectiveWidth - margin;
    this.dropdownRight = effectiveWidth > 0
      ? Math.max(margin, Math.min(preferredRight, maxRight))
      : preferredRight;

    // Flip above the trigger when the dropdown would not fit below it.
    const spaceBelow = viewportHeight - rect.bottom - margin - 4;
    const spaceAbove = rect.top - margin - 4;

    if (height > spaceBelow && spaceAbove > spaceBelow) {
      this.dropdownMaxHeight = height > spaceAbove ? spaceAbove : null;
      this.dropdownTop = Math.max(margin, rect.top - Math.min(height, spaceAbove) - 4);
    } else {
      this.dropdownMaxHeight = height > spaceBelow ? spaceBelow : null;
      this.dropdownTop = rect.bottom + 4;
    }
  }

  /** Measures and positions in one go, for callers outside the render phases. */
  private updatePosition(): void {
    this.applyPosition(this.measure(this.dropdown?.nativeElement));
  }

  ngOnDestroy(): void {
    this.dropdownObserver?.disconnect();
    this.dropdownObserver = null;
  }
}
