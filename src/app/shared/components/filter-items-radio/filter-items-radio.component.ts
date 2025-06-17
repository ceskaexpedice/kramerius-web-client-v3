import {Component, EventEmitter, Input, Output} from '@angular/core';
import {FacetItem} from '../../../modules/models/facet-item';
import {MatRadioButton, MatRadioGroup} from '@angular/material/radio';
import {NgClass, NgForOf, NgIf} from '@angular/common';
import {TranslatePipe} from '@ngx-translate/core';
import {FormsModule} from '@angular/forms';

@Component({
  selector: 'app-filter-items-radio',
  imports: [
    MatRadioGroup,
    MatRadioButton,
    NgForOf,
    TranslatePipe,
    NgClass,
    NgIf,
    FormsModule,
  ],
  templateUrl: './filter-items-radio.component.html',
  styleUrl: './filter-items-radio.component.scss'
})
export class FilterItemsRadioComponent {

  @Input() items: FacetItem[] = [];
  @Input() facetKey!: string;
  @Input() selected: string | null = null;
  @Output() changed = new EventEmitter<string>();

  onSelectionChange(event: any) {
    console.log('Selection changed:', event.value); // ✅ Uistíme sa že sa volá

    this.changed.emit(event.value);
  }

  trackByFn(index: number, item: FacetItem): string {
    return item.name;
  }
}
