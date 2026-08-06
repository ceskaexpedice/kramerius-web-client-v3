import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { LinkifyPipe } from '../../pipes/linkify.pipe';

@Component({
  selector: 'app-accordion-item',
  imports: [CommonModule, TranslatePipe, LinkifyPipe],
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
  @Input() linkify: boolean = false;

  @Output() toggle = new EventEmitter<void>();

  private static nextId = 0;
  readonly panelId = `accordion-panel-${AccordionItem.nextId++}`;

  onToggle(): void {
    this.toggle.emit();
  }
}
