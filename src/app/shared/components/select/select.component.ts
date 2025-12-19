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
} from '@angular/core';
import { NgIf, NgForOf, NgClass } from '@angular/common';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { InputComponent } from '../input/input.component';

import { ScrollingModule } from '@angular/cdk/scrolling';

@Component({
  selector: 'app-select',
  standalone: true,
  imports: [NgIf, NgForOf, TranslatePipe, NgClass, FormsModule, InputComponent, ScrollingModule],
  templateUrl: './select.component.html',
  styleUrl: './select.component.scss',
})
export class SelectComponent<T = any> implements AfterViewInit, OnDestroy {
  private searchBuffer = '';
  private searchTimeout?: any;

  @Input() class = '';
  @Input() theme: 'light' | 'base' = 'base';
  @Input() options: T[] = [];
  @Input() displayFn: (option: T | null) => string = (o: T | null) => (o != null ? String(o) : '-');
  @Input() value: T | null = null;
  @Input() filterable = false;
  @Input() filterPlaceholder = 'Filter...';
  @Input() disabled = false;
  @Input() zIndex = 1000;

  // Virtual Scroll Inputs
  @Input() virtualScroll = false;
  @Input() itemSize = 36;
  @Input() visibleItemsCount = 8;

  @Output() valueChange = new EventEmitter<T>();

  open = signal(false);
  filterText = '';
  filteredOptions: T[] = [];
  focusedIndex = -1;
  showAbove = false;

  @ViewChild('wrapper') wrapperRef?: ElementRef;

  constructor(
    private hostRef: ElementRef,
    private translate: TranslateService
  ) { }

  getViewportHeight(): string {
    return `${this.visibleItemsCount * this.itemSize}px`;
  }

  ngAfterViewInit() {
    new ResizeObserver(() => this.checkPosition()).observe(document.body);
    document.addEventListener('click', this.onClickOutside);
    this.updateFilteredOptions();
  }

  ngOnDestroy() {
    document.removeEventListener('click', this.onClickOutside);
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

    requestAnimationFrame(() => this.checkPosition());
  }

  select(option: T) {
    this.value = option;
    this.valueChange.emit(option);
    this.open.set(false);
    this.filterText = '';
    this.updateFilteredOptions();
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
        if (this.filteredOptions.length > 0) {
          this.focusedIndex = 0;
          this.scrollFocusedIntoView();
        }
        event.preventDefault();
        break;
      case 'ArrowUp':
        if (this.filteredOptions.length > 0) {
          this.focusedIndex = this.filteredOptions.length - 1;
          this.scrollFocusedIntoView();
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
    if (!this.open()) return;

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
        const raw = this.displayFn(option);
        const translated = this.translate.instant(raw);
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
      const el = document.getElementById('option-' + this.focusedIndex);
      el?.scrollIntoView({ block: 'nearest' });
    });
  }

  private searchByCharacter(key: string) {
    if (key.length !== 1 || !/^[a-z0-9]$/i.test(key)) return;

    this.searchBuffer += key.toLowerCase();

    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => (this.searchBuffer = ''), 500);

    const matchIndex = this.filteredOptions.findIndex((opt) => {
      const raw = this.displayFn(opt);
      const translated = this.translate.instant(raw);
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
    const dropdownHeight = (this.filterable ? 50 : 0) + this.filteredOptions.length * 40; // Include filter input height if present
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    this.showAbove = spaceBelow < dropdownHeight && spaceAbove > dropdownHeight;
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
