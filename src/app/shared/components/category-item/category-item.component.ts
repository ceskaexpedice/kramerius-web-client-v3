import {Component, Input} from '@angular/core';

@Component({
  selector: 'app-category-item',
  imports: [],
  templateUrl: './category-item.component.html',
  styleUrl: './category-item.component.scss'
})
export class CategoryItemComponent {
  @Input() icon!: string;
  @Input() label!: string;
  @Input() count!: number;
  @Input() active: boolean = false;
}
