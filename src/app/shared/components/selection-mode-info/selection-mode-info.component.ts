import { Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { DontShowAgainService, DontShowDialogs } from '../../services/dont-show-again.service';
import { IIIFViewerService } from '../../services/iiif-viewer.service';

@Component({
  selector: 'app-selection-mode-info',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './selection-mode-info.component.html',
  styleUrl: './selection-mode-info.component.scss',
  host: {
    // Collapse the host when there is nothing to show (tip suppressed), so the
    // empty absolutely-positioned box neither shows nor catches clicks.
    '[style.display]': 'visible() ? "block" : "none"',
  },
})
export class SelectionModeInfoComponent implements OnInit {
  private dontShowAgainService = inject(DontShowAgainService);
  private iiifViewerService = inject(IIIFViewerService);

  /**
   * 'hint' — shown before anything is selected: prompts to drag and offers to
   * leave selection mode. 'tip' — shown after a selection, dismissible for good.
   */
  variant = input<'tip' | 'hint'>('tip');

  showTip = signal(true);
  visible = computed(() => this.variant() === 'hint' || this.showTip());
  private dontShowAgainChecked = false;

  ngOnInit(): void {
    this.showTip.set(this.dontShowAgainService.shouldShowDialog(DontShowDialogs.SelectionTip));
  }

  /** Only acknowledges the tip — the selected area stays as it is. */
  onConfirm(): void {
    this.saveDontShowPreference();
    this.showTip.set(false);
  }

  /** Leaves selection mode without selecting anything. */
  onCancel(): void {
    this.iiifViewerService.setSelectionMode(false);
  }

  onDontShowAgainChange(checked: boolean): void {
    this.dontShowAgainChecked = checked;
  }

  private saveDontShowPreference(): void {
    if (this.dontShowAgainChecked) {
      this.dontShowAgainService.setDontShowAgain(DontShowDialogs.SelectionTip);
    }
  }
}
