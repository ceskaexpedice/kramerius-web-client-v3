import {Component, EventEmitter, Input, Output} from '@angular/core';
import {TranslatePipe} from '@ngx-translate/core';

@Component({
  selector: 'app-category-item',
  imports: [
    TranslatePipe,
  ],
  templateUrl: './category-item.component.html',
  styleUrl: './category-item.component.scss'
})
export class CategoryItemComponent {
  @Input() icon!: string;
  @Input() label!: string;
  @Input() count!: number;
  @Input() url!: string;
  @Input() active: boolean = false;

  @Output() clicked: EventEmitter<string> = new EventEmitter<string>();

  onClick(): void {
    this.clicked.emit(this.label);
  }
}
