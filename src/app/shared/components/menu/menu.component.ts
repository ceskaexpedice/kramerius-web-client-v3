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
  ViewChildren,
} from '@angular/core';
import {Router} from '@angular/router';
import {CdkConnectedOverlay} from '@angular/cdk/overlay';
import {CdkTrapFocus} from '@angular/cdk/a11y';

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
}

@Component({
  selector: 'app-menu',
  imports: [
    CdkConnectedOverlay,
    CdkTrapFocus,
  ],
  templateUrl: './menu.component.html',
  styleUrl: './menu.component.scss'
})
export class MenuComponent {
  private router = inject(Router);

  // Inputs (signals)
  displayName = input<string>('');
  avatarUrl   = input<string | null>(null);
  items       = input<MenuItem[]>([
    { id: 'user-square', label: 'Můj účet', icon: 'person', route: ['/account'] },
    { id: 'saved',   label: 'Moje uložené seznamy', icon: 'heart', route: ['/saved'] },
    { id: 'question',    label: 'Nápověda', icon: 'help', route: ['/help'], dividerAbove: true },
    { id: 'logout',  label: 'Odhlásit se', icon: 'logout', variant: 'danger' }
  ]);
  placement   = input<MenuPlacement>('bottom-end');

  // Outputs (signals)
  select = output<MenuItem>();
  openedChange = output<boolean>();

  // Local state
  open = signal(false);

  @ViewChildren('menuItem', { read: ElementRef }) private itemEls!: QueryList<ElementRef<HTMLButtonElement>>;

  // Keep overlay positions in sync with placement input
  overlayPositions: Signal<any[]> = computed(() => {
    const p = this.placement();
    const base = { offsetX: 0, offsetY: 8 };
    const map: Record<MenuPlacement, any[]> = {
      'bottom-start': [{ ...base, originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top' }],
      'bottom-end'  : [{ ...base, originX: 'end',   originY: 'bottom', overlayX: 'end',   overlayY: 'top' }],
      'top-start'   : [{ ...base, originX: 'start', originY: 'top',    overlayX: 'start', overlayY: 'bottom' }],
      'top-end'     : [{ ...base, originX: 'end',   originY: 'top',    overlayX: 'end',   overlayY: 'bottom' }],
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
  close()  { this.open.set(false); }
  openAndFocus(index = 0) { if (!this.open()) { this.open.set(true); } queueMicrotask(() => this.focusIndex(index)); }

  onItemClick(item: MenuItem) {
    this.select.emit(item);
    // built-in navigation helpers
    if (item.externalUrl) window.open(item.externalUrl, '_blank', 'noopener');
    else if (item.route)  this.router.navigate(Array.isArray(item.route) ? item.route : [item.route]);
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

}
