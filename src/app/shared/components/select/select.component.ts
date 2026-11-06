import {
  Component,
  signal,
  EventEmitter,
  Output,
  Input,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnDestroy,
  OnChanges,
  SimpleChanges,
  TemplateRef,
  ChangeDetectorRef,
} from '@angular/core';
import { NgIf, NgForOf, NgClass, NgTemplateOutlet } from '@angular/common';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { InputComponent } from '../input/input.component';
import { resolveNamespacedTranslation } from '../../translation/namespaced-translation';

import { CdkVirtualScrollViewport, ScrollingModule } from '@angular/cdk/scrolling';

@Component({
  selector: 'app-select',
  standalone: true,
  imports: [NgIf, NgForOf, TranslatePipe, NgClass, NgTemplateOutlet, FormsModule, InputComponent, ScrollingModule],
  templateUrl: './select.component.html',
  styleUrl: './select.component.scss',
})
export class SelectComponent<T = any> implements AfterViewInit, OnDestroy, OnChanges {
  private searchBuffer = '';
  private searchTimeout?: any;

  @Input() class = '';
  /** Accessible name of what the select controls (e.g. "Sort by"); the current value is appended. */
  @Input() ariaLabel = '';
  @Input() size: 'sm' | 'base' = 'base';
  @Input() theme: 'light' | 'base' = 'base';
  @Input() options: T[] = [];
  @Input() displayFn: (option: T | null) => string = (o: T | null) => (o != null ? String(o) : '-');
  /**
   * When set, option labels are translated within this namespace
   * (e.g. 'language' -> key 'language-{code}'), falling back to the raw value
   * when no translation exists. Avoids collisions with the global namespace.
   */
  @Input() translateNamespace?: string;
  @Input() value: T | null = null;
  /**
   * Optional per-option leading content (e.g. a logo), rendered before the label
   * in both the trigger and the dropdown options. The template receives the
   * option as implicit context: `<ng-template let-option>`. When unset, nothing
   * extra is rendered and the select looks exactly as before.
   */
  @Input() optionPrefixTpl?: TemplateRef<{ $implicit: T | null }>;
  @Input() filterable = false;
  @Input() filterPlaceholder = 'Filter...';
  @Input() disabled = false;
  @Input() zIndex = 1000;
  @Input() showMicButton = false;

  // Virtual Scroll Inputs
  @Input() virtualScroll = false;
  @Input() itemSize = 36;
  @Input() visibleItemsCount = 8;

  @Output() valueChange = new EventEmitter<T>();
  @Output() closed = new EventEmitter<void>();

  open = signal(false);
  filterText = '';
  filteredOptions: T[] = [];
  focusedIndex = -1;
  showAbove = false;

  @ViewChild('wrapper') wrapperRef?: ElementRef;
  @ViewChild('filterInput') filterInputRef?: InputComponent;
  @ViewChild(CdkVirtualScrollViewport) virtualViewport?: CdkVirtualScrollViewport;

  constructor(
    private hostRef: ElementRef,
    private translate: TranslateService,
    private cdr: ChangeDetectorRef,
  ) { }

  /**
   * Real option height for the virtual list, measured from the rendered option's
   * line height and padding. The `itemSize` input (36px) only matched the default
   * text size: with the accessibility text scale the options grew taller than the
   * viewport assumed, and the list drifted and jumped while scrolling.
   */
  private measuredItemSize: number | null = null;

  /** Item size the virtual viewport and every option use. */
  get virtualItemSize(): number {
    return this.measuredItemSize ?? this.itemSize;
  }

  getViewportHeight(): string {
    // No taller than the options it holds, so a filtered list leaves no blank space,
    // and no taller than the room left inside a clipping container (see checkPosition).
    const maxRows = this.fitRows ?? this.visibleItemsCount;
    const rows = Math.max(1, Math.min(this.visibleItemsCount, maxRows, this.filteredOptions.length));
    return `${rows * this.virtualItemSize}px`;
  }

  /**
   * Rows that fit into the space available when the dropdown is opened inside a
   * clipping container (e.g. the date picker's scrollable popup); null = no limit.
   */
  fitRows: number | null = null;

  /**
   * Called when the list opens (see toggle()). The viewport renders its items a
   * frame or two after it appears, so wait for the first option.
   */
  private measureVirtualItemSize(attemptsLeft = 5): void {
    if (!this.open()) return;
    const viewportEl = this.virtualViewport?.elementRef.nativeElement as HTMLElement | undefined;
    const option = viewportEl?.querySelector('.option') as HTMLElement | null;
    if (!option) {
      if (attemptsLeft > 0) {
        requestAnimationFrame(() => this.measureVirtualItemSize(attemptsLeft - 1));
      }
      return;
    }
    // Computed line height and padding do not depend on the pinned option
    // height, so measuring them cannot feed back into itself.
    const style = getComputedStyle(option);
    const natural = (parseFloat(style.lineHeight) || 0)
      + (parseFloat(style.paddingTop) || 0)
      + (parseFloat(style.paddingBottom) || 0);
    if (!natural) return;
    const next = Math.ceil(natural);
    if (next !== this.virtualItemSize) {
      this.measuredItemSize = next;
      this.cdr.markForCheck();
      this.virtualViewport?.checkViewportSize();
    }
  }

  get focusedOptionLabel(): string {
    const option = this.filteredOptions[this.focusedIndex];
    if (this.focusedIndex < 0 || option === undefined) return '';
    return this.displayLabel(option);
  }

  /**
   * Resolves the visible label for an option, honoring translateNamespace when
   * set (with raw-value fallback) and falling back to plain translation otherwise.
   */
  displayLabel(option: T | null): string {
    const raw = this.displayFn(option);
    if (this.translateNamespace) {
      return resolveNamespacedTranslation(this.translate, raw, this.translateNamespace);
    }
    return this.translate.instant(raw);
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['options']) {
      this.updateFilteredOptions();
    }
  }

  ngAfterViewInit() {
    new ResizeObserver(() => this.checkPosition()).observe(document.body);
    document.addEventListener('click', this.onClickOutside);
    this.updateFilteredOptions();
  }

  ngOnDestroy() {
    document.removeEventListener('click', this.onClickOutside);
  }

  focus(): void {
    if (!this.open()) {
      this.toggle();
    }
  }

  toggle() {
    if (this.disabled) return;
    this.open.update((v) => {
      if (!v) {
        this.filterText = '';
        this.updateFilteredOptions();
        this.focusedIndex = this.filteredOptions.findIndex((o) => o === this.value);
        if (this.focusedIndex >= 0) {
          this.scrollFocusedIntoView();
        }
      }
      return !v;
    });

    requestAnimationFrame(() => {
      this.checkPosition();
      if (this.open() && this.virtualScroll) {
        this.measureVirtualItemSize();
      }
      if (this.open() && this.filterable) {
        this.filterInputRef?.focus();
      }
    });
  }

  select(option: T) {
    this.value = option;
    this.valueChange.emit(option);
    this.open.set(false);
    this.filterText = '';
    this.updateFilteredOptions();
    setTimeout(() => this.closed.emit(), 0);
  }

  onFilterChange(text: string | number) {
    const filterText = String(text);
    this.filterText = filterText;
    this.updateFilteredOptions();
    this.focusedIndex = -1; // Reset focused index when filtering
  }

  onFilterKeyDown(event: KeyboardEvent) {
    const key = event.key;

    switch (key) {
      case 'ArrowDown':
        if (this.focusedIndex < 0) {
          if (this.filteredOptions.length > 0) {
            this.focusedIndex = 0;
            this.scrollFocusedIntoView();
          }
        } else {
          this.moveFocus(1);
        }
        event.preventDefault();
        break;
      case 'ArrowUp':
        if (this.focusedIndex < 0) {
          if (this.filteredOptions.length > 0) {
            this.focusedIndex = this.filteredOptions.length - 1;
            this.scrollFocusedIntoView();
          }
        } else {
          this.moveFocus(-1);
        }
        event.preventDefault();
        break;
      case 'Enter':
        if (this.focusedIndex >= 0 && this.filteredOptions[this.focusedIndex]) {
          this.select(this.filteredOptions[this.focusedIndex]);
          event.preventDefault();
        }
        break;
      case 'Escape':
        this.open.set(false);
        event.preventDefault();
        break;
      case 'Tab':
        this.open.set(false);
        break;
    }
  }

  onKeyDown(event: KeyboardEvent) {
    if (!this.open()) {
      switch (event.key) {
        case 'Enter':
        case ' ':
        case 'ArrowDown':
        case 'ArrowUp':
          this.toggle();
          event.preventDefault();
          break;
      }
      return;
    }

    const key = event.key;

    switch (key) {
      case 'ArrowDown':
        this.moveFocus(1);
        event.preventDefault();
        break;
      case 'ArrowUp':
        this.moveFocus(-1);
        event.preventDefault();
        break;
      case 'Enter':
      case ' ':
        if (this.focusedIndex >= 0) {
          this.select(this.filteredOptions[this.focusedIndex]);
          event.preventDefault();
        }
        break;
      case 'Escape':
        this.open.set(false);
        event.preventDefault();
        break;
      default:
        this.searchByCharacter(key);
        break;
    }
  }

  private updateFilteredOptions() {
    if (!this.filterText.trim()) {
      this.filteredOptions = [...this.options];
    } else {
      const filterLower = this.filterText.toLowerCase();
      this.filteredOptions = this.options.filter((option) => {
        const translated = this.displayLabel(option);
        return translated.toLowerCase().includes(filterLower);
      });
    }
  }

  private moveFocus(delta: number) {
    if (!this.filteredOptions.length) return;

    this.focusedIndex = (this.focusedIndex + delta + this.filteredOptions.length) % this.filteredOptions.length;
    this.scrollFocusedIntoView();
  }

  private scrollFocusedIntoView() {
    requestAnimationFrame(() => {
      if (this.virtualScroll && this.virtualViewport) {
        this.measureVirtualItemSize();
        // Virtual scroll: off-screen options aren't in the DOM, so scrollIntoView
        // can't find them. Drive the viewport directly, centering when possible.
        const offset = Math.max(0, Math.floor(this.visibleItemsCount / 2) - 1);
        const target = Math.max(0, this.focusedIndex - offset);
        this.virtualViewport.scrollToIndex(target);
        return;
      }
      const el = document.getElementById('option-' + this.focusedIndex);
      el?.scrollIntoView({ block: 'nearest' });
    });
  }

  private searchByCharacter(key: string) {
    if (key.length !== 1 || !/^[\p{L}\p{N}]$/u.test(key)) return;

    this.searchBuffer += key.toLowerCase();

    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => (this.searchBuffer = ''), 500);

    const matchIndex = this.filteredOptions.findIndex((opt) => {
      const translated = this.displayLabel(opt);
      return translated.toLowerCase().startsWith(this.searchBuffer);
    });

    if (matchIndex !== -1) {
      this.focusedIndex = matchIndex;
      this.scrollFocusedIntoView();
    }
  }

  focusFirst() {
    this.focusedIndex = 0;
  }

  checkPosition() {
    const wrapperEl = this.wrapperRef?.nativeElement as HTMLElement;
    if (!wrapperEl) return;

    const rect = wrapperEl.getBoundingClientRect();
    const rowHeight = this.virtualScroll ? this.virtualItemSize : 40;
    const filterHeight = this.filterable ? 50 : 0;
    const gap = 12; // dropdown margin + border
    const rows = Math.min(this.filteredOptions.length, this.visibleItemsCount);
    const dropdownHeight = filterHeight + Math.max(1, rows) * rowHeight + gap;

    // The dropdown is absolutely positioned, so an ancestor with overflow other
    // than visible (e.g. the date picker popup's scroll area) clips it - measure
    // the room inside that ancestor, not just inside the window.
    const clip = this.findClippingAncestor(wrapperEl)?.getBoundingClientRect();
    const bottomLimit = Math.min(window.innerHeight, clip ? clip.bottom : Infinity);
    const topLimit = Math.max(0, clip ? clip.top : 0);
    const spaceBelow = bottomLimit - rect.bottom;
    const spaceAbove = rect.top - topLimit;

    this.showAbove = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;

    const space = this.showAbove ? spaceAbove : spaceBelow;
    this.fitRows = space < dropdownHeight
      ? Math.max(2, Math.floor((space - filterHeight - gap) / rowHeight))
      : null;
  }

  private findClippingAncestor(el: HTMLElement): HTMLElement | null {
    let node = el.parentElement;
    while (node && node !== document.body) {
      const style = getComputedStyle(node);
      if (/(auto|scroll|hidden|clip)/.test(style.overflowY)) return node;
      node = node.parentElement;
    }
    return null;
  }

  trackByFn = (_: number, option: T) => option;

  private onClickOutside = (event: Event) => {
    if (!this.hostRef.nativeElement.contains(event.target)) {
      this.open.set(false);
      this.filterText = '';
      this.updateFilteredOptions();
    }
  };
}
