import { Component, inject } from '@angular/core';
import { NgIf } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { SelectionService } from '../../services';

@Component({
  selector: 'app-admin-selection-count',
  standalone: true,
  imports: [
    NgIf,
    TranslatePipe,
  ],
  templateUrl: './admin-selection-count.component.html',
  styleUrl: './admin-selection-count.component.scss'
})
export class AdminSelectionCountComponent {
  public selectionService = inject(SelectionService);
}
