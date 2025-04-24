import {
  Component,
  signal,
  EventEmitter,
  Output,
  Input,
  ElementRef,
  ViewChild,
  AfterViewInit
} from '@angular/core';
import { NgIf, NgForOf } from '@angular/common';

@Component({
  selector: 'app-select',
  standalone: true,
  imports: [NgIf, NgForOf],
  templateUrl: './select.component.html',
  styleUrl: './select.component.scss'
})
export class SelectComponent<T = any> implements AfterViewInit {
  @Input() options: T[] = [];
  @Input() displayFn: (option: T | null) => string = (o: T | null) => o != null ? String(o) : '-';
  @Input() value: T | null = null;
  @Output() valueChange = new EventEmitter<T>();

  open = signal(false);
  showAbove = false;
  focusedIndex = -1;

  @ViewChild('wrapper', { static: false }) wrapperRef?: ElementRef;

  constructor(private hostRef: ElementRef) {}

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

    // Delay until DOM updates
    requestAnimationFrame(() => this.checkPosition());
  }

  select(option: T) {
    this.value = option;
    this.valueChange.emit(option);
    this.open.set(false);
  }

  onKeyDown(event: KeyboardEvent) {
    if (!this.open()) return;

    switch (event.key) {
      case 'ArrowDown':
        this.focusedIndex = (this.focusedIndex + 1) % this.options.length;
        event.preventDefault();
        break;
      case 'ArrowUp':
        this.focusedIndex = (this.focusedIndex - 1 + this.options.length) % this.options.length;
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
    }
  }

  focusFirst() {
    this.focusedIndex = 0;
  }

  checkPosition() {
    if (!this.wrapperRef?.nativeElement) return;

    const wrapperEl = this.wrapperRef.nativeElement as HTMLElement;
    const rect = wrapperEl.getBoundingClientRect();
    const dropdownHeight = this.options.length * 40; // približná výška jednej položky (40px)

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
