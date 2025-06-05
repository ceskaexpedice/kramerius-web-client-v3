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

@Component({
  selector: 'app-select',
  standalone: true,
  imports: [NgIf, NgForOf, TranslatePipe, NgClass],
  templateUrl: './select.component.html',
  styleUrl: './select.component.scss',
})
export class SelectComponent<T = any> implements AfterViewInit, OnDestroy {
  private searchBuffer = '';
  private searchTimeout?: any;

  @Input() theme: 'light' | 'base' = 'base';
  @Input() options: T[] = [];
  @Input() displayFn: (option: T | null) => string = (o: T | null) => (o != null ? String(o) : '-');
  @Input() value: T | null = null;
  @Output() valueChange = new EventEmitter<T>();

  open = signal(false);
  showAbove = false;
  focusedIndex = -1;

  @ViewChild('wrapper') wrapperRef?: ElementRef;

  constructor(
    private hostRef: ElementRef,
    private translate: TranslateService
  ) {}

  ngAfterViewInit() {
    new ResizeObserver(() => this.checkPosition()).observe(document.body);
    document.addEventListener('click', this.onClickOutside);
  }

  ngOnDestroy() {
    document.removeEventListener('click', this.onClickOutside);
  }

  toggle() {
    this.open.update((v) => {
      if (!v) {
        this.focusedIndex = this.options.findIndex((o) => o === this.value);
      }
      return !v;
    });

    requestAnimationFrame(() => this.checkPosition());
  }

  select(option: T) {
    this.value = option;
    this.valueChange.emit(option);
    this.open.set(false);
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
          this.select(this.options[this.focusedIndex]);
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

  private moveFocus(delta: number) {
    if (!this.options.length) return;

    this.focusedIndex = (this.focusedIndex + delta + this.options.length) % this.options.length;
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

    const matchIndex = this.options.findIndex((opt) => {
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
    const dropdownHeight = this.options.length * 40;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    this.showAbove = spaceBelow < dropdownHeight && spaceAbove > dropdownHeight;
  }

  trackByFn = (_: number, option: T) => option;

  private onClickOutside = (event: Event) => {
    if (!this.hostRef.nativeElement.contains(event.target)) {
      this.open.set(false);
    }
  };
}
