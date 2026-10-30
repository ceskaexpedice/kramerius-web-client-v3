import { Component, computed, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { BreakpointService } from '../../services/breakpoint.service';

/**
 * Dismisses the collapsible sidebar from inside its own first row.
 *
 * Needed on the landscape phone, where the sidebar renders as a tablet overlay
 * whose own floating close button sat where the "Filtry" caption used to be
 * (a lone X costs a whole row). On a portrait phone the sidebar is a fixed
 * panel, closed from the action toolbar's X, so this renders nothing there.
 *
 * The button pairs with whatever leads the sidebar - the in-document
 * search field, or the playlist toggle in the sound-recording one. Renders
 * nothing on roomy viewports, where the sidebar is not collapsible
 * (GitHub issue #177).
 */
@Component({
  selector: 'app-sheet-close-button',
  imports: [TranslatePipe],
  template: `
    @if (visible()) {
      <button class="sheet-close-button" type="button" (click)="close()"
        [attr.aria-label]="'close-dialog--arialabel' | translate">
        <i class="icon-close" aria-hidden="true"></i>
      </button>
    }
  `,
  styleUrl: './sheet-close-button.component.scss'
})
export class SheetCloseButtonComponent {
  protected breakpointService = inject(BreakpointService);

  /**
   * Shown whenever the sidebar is a dismissible overlay: the landscape-phone or
   * the tablet overlay (sidebar not docked). Not on a portrait phone (the toolbar
   * closes the fixed panel) nor on roomy viewports (the sidebar is docked).
   */
  protected visible = computed(() =>
    !this.breakpointService.isMobile()
    && (this.breakpointService.isShortViewport() || !this.breakpointService.sidebarVisible())
  );

  close(): void {
    this.breakpointService.manualToggle.set(false);
  }
}
