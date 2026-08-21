import {
  Component,
  computed, effect,
  ElementRef,
  inject,
  input,
  output,
  QueryList,
  Signal,
  signal,
  viewChild,
  ViewChildren,
} from '@angular/core';
import { Router } from '@angular/router';
import { CdkConnectedOverlay, Overlay } from '@angular/cdk/overlay';
import { CdkTrapFocus } from '@angular/cdk/a11y';
import { TranslatePipe } from '@ngx-translate/core';
import { ClickOutsideDirective } from '../../directives';

export type MenuPlacement = 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end';

export interface MenuItem {
  id: string;
  label: string;
  icon?: string;
  route?: string | any[];
  externalUrl?: string;
  disabled?: boolean;
  dividerAbove?: boolean;
  variant?: 'default' | 'danger';
  count?: number;
}

@Component({
  selector: 'app-menu',
  imports: [
    CdkConnectedOverlay,
    CdkTrapFocus,
    TranslatePipe,
    ClickOutsideDirective,
  ],
  templateUrl: './menu.component.html',
  styleUrl: './menu.component.scss'
})
export class MenuComponent {
  private router = inject(Router);
  private overlay = inject(Overlay);

  /**
   * Reposition on scroll rather than staying put, so the panel keeps honouring
   * its flipped position and available height while the page moves under it.
   */
  scrollStrategy = this.overlay.scrollStrategies.reposition({ autoClose: true });

  // Inputs (signals)
  displayName = input<string>('');
  avatarUrl = input<string | null>(null);
  items = input<MenuItem[]>([]);
  placement = input<MenuPlacement>('bottom-end');

  // Outputs (signals)
  select = output<MenuItem>();
  openedChange = output<boolean>();

  // Custom trigger
  customTrigger = input(false);

  // Local state
  open = signal(false);

  triggerEl = viewChild<ElementRef>('trigger');
  @ViewChildren('menuItem', { read: ElementRef }) private itemEls!: QueryList<ElementRef<HTMLButtonElement>>;

  /**
   * Each placement resolves to the requested position followed by its vertical
   * flip, so the CDK can fall back when the preferred side has no room. Without
   * a fallback the panel stays pinned below the trigger and runs off screen on
   * short viewports such as a landscape phone (issue #162).
   */
  overlayPositions: Signal<any[]> = computed(() => {
    const p = this.placement();
    const below = { offsetX: 0, offsetY: 8, originY: 'bottom', overlayY: 'top' };
    const above = { offsetX: 0, offsetY: -8, originY: 'top', overlayY: 'bottom' };
    const start = { originX: 'start', overlayX: 'start' };
    const end = { originX: 'end', overlayX: 'end' };
    const map: Record<MenuPlacement, any[]> = {
      'bottom-start': [{ ...below, ...start }, { ...above, ...start }],
      'bottom-end': [{ ...below, ...end }, { ...above, ...end }],
      'top-start': [{ ...above, ...start }, { ...below, ...start }],
      'top-end': [{ ...above, ...end }, { ...below, ...end }],
    };
    return map[p];
  });

  // Derived
  initials = computed(() => {
    const name = this.displayName()?.trim() ?? 'U';
    const parts = name.split(/\s+/);
    return (parts[0]?.[0] ?? 'U') + (parts[1]?.[0] ?? '');
  });

  // Side-effect to notify when opened changes
  _ = effect(() => this.openedChange.emit(this.open()));

  toggle() { this.open.update(v => !v); }
  close() { this.open.set(false); }
  openAndFocus(index = 0) { if (!this.open()) { this.open.set(true); } queueMicrotask(() => this.focusIndex(index)); }

  onItemClick(item: MenuItem) {
    this.select.emit(item);
    // built-in navigation helpers
    if (item.externalUrl) window.open(item.externalUrl, '_blank', 'noopener');
    else if (item.route) this.router.navigate(Array.isArray(item.route) ? item.route : [item.route]);
    this.close();
  }

  // Keyboard focus management
  focusIndex(i: number) {
    const arr = this.itemEls?.toArray() ?? [];
    const el = arr[Math.max(0, Math.min(i, arr.length - 1))]?.nativeElement;
    el?.focus();
  }
  focusNext() { this.move(1); }
  focusPrev() { this.move(-1); }
  private move(delta: number) {
    const els = this.itemEls?.toArray() ?? [];
    const idx = els.findIndex(e => e.nativeElement === document.activeElement);
    const next = (idx + delta + els.length) % els.length;
    this.focusIndex(next);
  }

  outsideClicked(event: MouseEvent | void) {
    if (event && this.triggerEl()?.nativeElement.contains(event.target)) {
      return;
    }
    if (this.open()) {
      this.close();
    }
  }

}
