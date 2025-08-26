import { Component, Input, signal } from '@angular/core';
import { NgIf } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { expandCollapseAnimation } from '../../animations';

@Component({
  selector: 'app-collapsible-category',
  standalone: true,
  imports: [
    NgIf,
    TranslatePipe
  ],
  templateUrl: './collapsible-category.component.html',
  styleUrl: './collapsible-category.component.scss',
  animations: [expandCollapseAnimation]
})
export class CollapsibleCategoryComponent {
  @Input() label!: string;
  @Input() showToggle = true;
  @Input() showBottomBorder = true;
  @Input() initiallyExpanded = true;
  @Input() showIndicator = false;
  @Input() indicatorText = '';
  @Input() labelIcon = '';

  expanded = signal(this.initiallyExpanded);

  ngOnInit() {
    this.expanded.set(this.initiallyExpanded);
  }

  toggleExpanded() {
    this.expanded.update(current => !current);
  }
}
