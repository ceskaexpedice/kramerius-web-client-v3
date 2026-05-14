import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { RecordItemComponent } from '../../../../shared/components/record-item/record-item.component';
import { RecordItem } from '../../../../shared/components/record-item/record-item.model';

@Component({
  selector: 'app-periodical-day-issues-popup',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe, RecordItemComponent],
  templateUrl: './periodical-day-issues-popup.component.html',
  styleUrl: './periodical-day-issues-popup.component.scss',
})
export class PeriodicalDayIssuesPopupComponent {
  items = input.required<RecordItem[]>();
  titleKey = input<string>('select-document');
  close = output<void>();

  onClose(): void {
    this.close.emit();
  }
}
