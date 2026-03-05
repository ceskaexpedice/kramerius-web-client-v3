import {
  Component,
  ChangeDetectionStrategy,
  signal,
  TemplateRef,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { trigger, state, style, transition, animate } from '@angular/animations';

/**
 * CDK-based tooltip component that is displayed in an overlay
 * Supports both plain text and HTML template content
 */
@Component({
  selector: 'app-cdk-tooltip',
  standalone: true,
  imports: [NgTemplateOutlet],
  template: `
    <div class="tooltip-content" [style.max-width.px]="maxWidth()">
      @if (contentTemplate()) {
        <ng-container *ngTemplateOutlet="contentTemplate()!" />
      } @else {<ng-container>{{ content() }}</ng-container>}
    </div>
  `,
  styleUrls: ['./cdk-tooltip.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('tooltip', [
      state('initial, void, hidden', style({ opacity: 0, transform: 'scale(0.95)' })),
      state('visible', style({ opacity: 1, transform: 'scale(1)' })),
      transition('* => visible', animate('150ms cubic-bezier(0.0, 0.0, 0.2, 1)')),
      transition('* => hidden', animate('100ms cubic-bezier(0.4, 0.0, 1, 1)')),
    ]),
  ],
  host: {
    'class': 'cdk-tooltip',
    '[class]': 'tooltipClass()',
    '[@tooltip]': 'animationState()',
  },
})
export class CdkTooltipComponent {
  /**
   * The tooltip content text (used when contentTemplate is not provided)
   */
  content = signal<string>('');

  /**
   * The tooltip content as a TemplateRef (for HTML content)
   */
  contentTemplate = signal<TemplateRef<any> | null>(null);

  /**
   * Custom CSS class for the tooltip
   */
  tooltipClass = signal<string>('');

  /**
   * Maximum width of the tooltip
   */
  maxWidth = signal<number>(250);

  /**
   * Animation state
   */
  animationState = signal<'initial' | 'visible' | 'hidden'>('initial');

  /**
   * Show the tooltip with animation
   */
  show(): void {
    this.animationState.set('visible');
  }

  /**
   * Hide the tooltip with animation
   */
  hide(): void {
    this.animationState.set('hidden');
  }
}
