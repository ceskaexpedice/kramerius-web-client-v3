import { Component, Input } from '@angular/core';
import {NgIf} from '@angular/common';

@Component({
  selector: 'app-tab-item',
  template: `
    <div *ngIf="active">
      <ng-content></ng-content>
    </div>
  `,
  imports: [
    NgIf,
  ],
})
export class TabItemComponent {
  @Input() label!: string;
  active = false;
}
