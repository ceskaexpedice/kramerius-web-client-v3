import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { MatCheckbox } from '@angular/material/checkbox';
import { TranslatePipe } from '@ngx-translate/core';
import { NgClass, NgIf } from '@angular/common';
import { FormatNumberPipe } from '../../pipes/format-number.pipe';
import { ConfigLabelPipe } from '../../pipes/config-label.pipe';
import {facetKeysEnum} from '../../../modules/search-results-page/const/facets';

@Component({
  selector: 'app-filter-item',
  imports: [
    MatCheckbox,
    NgIf,
    NgClass,
    FormatNumberPipe,
    TranslatePipe,
    ConfigLabelPipe,
  ],
  templateUrl: './filter-item.component.html',
  styleUrl: './filter-item.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FilterItemComponent {

  @Input() label!: string;
  @Input() facetKey?: string; // Used to determine translation source
  @Input() truncateLabel: boolean = false;
  @Input() count!: number;
  @Input() checked = false;
  @Input() icon: string | null = null;
  @Input() disabled = false;
  @Input() itemIconClass?: string;
  @Output() toggled = new EventEmitter<void>();

  get isImageIcon(): boolean {
    return this.icon?.includes('/') || this.icon?.includes('.') || false;
  }

  get isLicense(): boolean {
    return this.facetKey === facetKeysEnum.license;
  }

}
