import {Component, EventEmitter, inject, Input, Output} from '@angular/core';
import {TranslatePipe} from '@ngx-translate/core';
import {RecordHandlerService} from '../../services/record-handler.service';

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

  recordHandler = inject(RecordHandlerService);

  onClick(): void {
    this.clicked.emit(this.label);
  }
}
