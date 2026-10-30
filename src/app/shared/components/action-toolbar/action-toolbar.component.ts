import {Component, computed, inject, input, Input} from '@angular/core';
import {TranslatePipe} from '@ngx-translate/core';
import {FixedPanelEdgeDirective} from '../fixed-panel/fixed-panel-edge.directive';
import {FixedPanelService} from '../fixed-panel/fixed-panel.service';
import {BreakpointService} from '../../services/breakpoint.service';

@Component({
  selector: 'app-action-toolbar',
  hostDirectives: [{ directive: FixedPanelEdgeDirective, inputs: ['appFixedPanelEdge'] }],
  imports: [
    TranslatePipe,
  ],
  templateUrl: './action-toolbar.component.html',
  styleUrl: './action-toolbar.component.scss'
})
export class ActionToolbarComponent {

  @Input() hasCenterContent = false;

  /** The open panel is closed by its own toggle in the toolbar, so no close button. */
  readonly suppressPanelClose = input(false);

  protected readonly fixedPanel = inject(FixedPanelService);
  private readonly breakpointService = inject(BreakpointService);

  protected readonly showPanelClose = computed(() =>
    this.breakpointService.isMobile() && this.fixedPanel.anyOpen() && !this.suppressPanelClose());

}
