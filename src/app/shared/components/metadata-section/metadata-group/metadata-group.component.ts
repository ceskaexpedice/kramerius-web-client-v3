import { AfterViewChecked, Component, ElementRef, Input, OnInit, Renderer2, inject, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

const STORAGE_KEY = 'cdk.metadataGroupsCollapsed';

function readCollapsed(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return new Set(raw ? JSON.parse(raw) as string[] : []);
  } catch {
    return new Set();
  }
}

function writeCollapsed(set: Set<string>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
  } catch {
    // storage unavailable — state just won't persist
  }
}

/**
 * A titled, collapsible group of metadata fields ("Publication", "Identifiers"…).
 * The heading is a real h3 holding a disclosure button, so screen-reader users
 * can jump between groups with heading navigation and expand/collapse them.
 * Collapsed state is remembered per group across documents. A group whose
 * projected fields all rendered nothing hides itself entirely.
 */
@Component({
  selector: 'app-metadata-group',
  imports: [TranslatePipe],
  template: `
    <div class="metadata-group" role="group" [attr.aria-labelledby]="headingId">
      <h3 class="metadata-group__heading" [id]="headingId">
        <button type="button" class="metadata-group__toggle"
                [attr.aria-expanded]="expanded()"
                [attr.aria-controls]="bodyId"
                (click)="toggle()">
          <span>{{ title | translate }}</span>
          <i class="icon-arrow-up-1" [class.rotated]="!expanded()" aria-hidden="true"></i>
        </button>
      </h3>
      <div class="metadata-group__body" [id]="bodyId" [hidden]="!expanded()">
        <ng-content></ng-content>
      </div>
    </div>
  `,
  styleUrl: './metadata-group.component.scss',
})
export class MetadataGroupComponent implements OnInit, AfterViewChecked {
  /** Stable key, used for the remembered collapsed state and element ids. */
  @Input({ required: true }) key = '';
  /** Translation key of the heading. */
  @Input({ required: true }) title = '';

  private static nextId = 0;
  private readonly uid = MetadataGroupComponent.nextId++;
  readonly expanded = signal(true);
  private host = inject(ElementRef<HTMLElement>);
  private renderer = inject(Renderer2);
  private isEmpty: boolean | null = null;

  get headingId(): string { return `metadata-group-${this.key}-${this.uid}-heading`; }
  get bodyId(): string { return `metadata-group-${this.key}-${this.uid}-body`; }

  ngOnInit(): void {
    this.expanded.set(!readCollapsed().has(this.key));
  }

  toggle(): void {
    const next = !this.expanded();
    this.expanded.set(next);
    const set = readCollapsed();
    if (next) set.delete(this.key); else set.add(this.key);
    writeCollapsed(set);
  }

  ngAfterViewChecked(): void {
    // Direct DOM write (no binding) so toggling never causes an
    // ExpressionChanged error; cheap: one querySelector per check.
    const body = (this.host.nativeElement as HTMLElement).querySelector('.metadata-group__body');
    const empty = !body || !body.querySelector('*');
    if (empty !== this.isEmpty) {
      this.isEmpty = empty;
      if (empty) {
        this.renderer.setStyle(this.host.nativeElement, 'display', 'none');
      } else {
        this.renderer.removeStyle(this.host.nativeElement, 'display');
      }
    }
  }
}
