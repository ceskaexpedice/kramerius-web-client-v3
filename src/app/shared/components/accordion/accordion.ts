import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AccordionItem } from '../accordion-item/accordion-item';

export interface AccordionItemData {
  id: string | number;
  title: string;
  content: string;
  isOpen?: boolean;
  index?: number;
  allowHtml?: boolean;
}

@Component({
  selector: 'app-accordion',
  imports: [CommonModule, AccordionItem],
  templateUrl: './accordion.html',
  styleUrl: './accordion.scss',
  standalone: true
})
export class Accordion {
  @Input() items: AccordionItemData[] = [];
  @Input() openIconClass: string = 'icon-minus-circle';
  @Input() closeIconClass: string = 'icon-add-circle';
  @Input() allowMultipleOpen: boolean = false;

  toggleItem(itemId: string | number): void {
    const item = this.items.find(i => i.id === itemId);
    if (!item) return;

    if (!this.allowMultipleOpen && !item.isOpen) {
      // Close all other items
      this.items.forEach(i => {
        if (i.id !== itemId) {
          i.isOpen = false;
        }
      });
    }

    item.isOpen = !item.isOpen;
  }
}
