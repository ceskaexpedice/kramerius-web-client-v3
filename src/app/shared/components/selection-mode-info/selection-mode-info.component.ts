import { Component, inject, Input, Output, EventEmitter, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { DontShowAgainService, DontShowDialogs } from '../../services/dont-show-again.service';

@Component({
  selector: 'app-selection-mode-info',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './selection-mode-info.component.html',
  styleUrl: './selection-mode-info.component.scss'
})
export class SelectionModeInfoComponent implements OnInit {
  @Input() hasSelection = false;

  @Output() editSelection = new EventEmitter<void>();
  @Output() cancelSelection = new EventEmitter<void>();

  private dontShowAgainService = inject(DontShowAgainService);

  showTip = signal(true);
  private dontShowAgainChecked = false;

  ngOnInit(): void {
    this.showTip.set(this.dontShowAgainService.shouldShowDialog(DontShowDialogs.SelectionTip));
  }

  onEditSelection(): void {
    this.saveDontShowPreference();
    this.editSelection.emit();
  }

  onCancelSelection(): void {
    this.saveDontShowPreference();
    this.cancelSelection.emit();
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
