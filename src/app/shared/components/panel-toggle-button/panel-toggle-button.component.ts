import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { CdkTooltipDirective } from '../../directives';
import { METADATA_PANEL_ID } from '../detail-layout/metadata-panel-id';

/**
 * Show/hide toggle for the right document-information panel. It sits at the
 * right end of the page toolbar — the same spot whether the panel is open or
 * closed, next to the panel it controls — and is a disclosure button
 * (aria-expanded + aria-controls) for assistive technology.
 */
@Component({
  selector: 'app-panel-toggle-button',
  imports: [TranslatePipe, CdkTooltipDirective],
  template: `
    <span class="panel-toggle__divider" aria-hidden="true"></span>
    <button type="button"
            class="panel-toggle"
            [attr.aria-expanded]="open"
            [attr.aria-controls]="controls"
            [attr.aria-label]="(open ? 'metadata-panel--hide' : 'metadata-panel--show') | translate"
            [appCdkTooltip]="(open ? 'metadata-panel--hide' : 'metadata-panel--show') | translate"
            [tooltipPosition]="'bottom'"
            (click)="toggle.emit()">
      <i class="icon-sidebar-right" aria-hidden="true"></i>
    </button>
  `,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      gap: var(--spacing-x2);
      flex-shrink: 0;
    }

    .panel-toggle__divider {
      width: 1px;
      height: 20px;
      background: var(--color-border-contrast);
    }

    // The default white outlined button used across the toolbars (as
    // button.outlined.light); open/closed is conveyed by aria-expanded and the
    // panel itself, not by a coloured state.
    .panel-toggle {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      padding: 0;
      border-radius: var(--spacing-x2);
      border: 1px solid var(--color-border-bright);
      background: var(--color-secondary);
      color: var(--color-text-btn-secondary-default);
      cursor: pointer;
      transition: background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease;

      i {
        font-size: var(--font-size-large);
        line-height: 1;
      }

      &:hover {
        border-color: var(--color-border-secondary-hover);
        color: var(--color-text-btn-secondary-hover);
      }

      &:active {
        border-color: var(--color-border-secondary-pressed);
        color: var(--color-text-btn-secondary-pressed);
      }

      &:focus-visible {
        outline: 2px solid var(--color-border-primary-default);
        outline-offset: 2px;
      }

      // On touch tablets this is the only control that closes the overlay panel.
      @media (pointer: coarse) {
        width: 40px;
        height: 40px;
      }
    }
  `,
})
export class PanelToggleButtonComponent {
  @Input() open = false;
  /** id of the panel element (aria-controls). */
  @Input() controls = METADATA_PANEL_ID;
  @Output() toggle = new EventEmitter<void>();
}
