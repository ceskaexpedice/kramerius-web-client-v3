import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-accordion-item',
  imports: [CommonModule, TranslateModule],
  templateUrl: './accordion-item.html',
  styleUrl: './accordion-item.scss',
  standalone: true
})
export class AccordionItem {
  @Input() title: string = '';
  @Input() content: string = '';
  @Input() isOpen: boolean = false;
  @Input() index?: number;
  @Input() isFirstItem: boolean = false;
  @Input() openIconClass: string = 'icon-minus-circle';
  @Input() closeIconClass: string = 'icon-add-circle';
  @Input() allowHtml: boolean = false;

  @Output() toggle = new EventEmitter<void>();

  onToggle(): void {
    this.toggle.emit();
  }
}
