import { Component, Input } from '@angular/core';
import {NgClass, NgIf} from '@angular/common';

@Component({
  selector: 'app-tab-item',
  template: `
    <div [ngClass]="{ 'hidden': !active }" class="tab-content">
      <ng-content></ng-content>
    </div>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    .tab-content {
      display: flex;
      flex-direction: column;
      flex: 1;
      height: 100%;
    }

    .hidden {
      display: none;
    }
  `,
  imports: [
    NgIf,
    NgClass,
  ],
})
export class TabItemComponent {
  @Input() label!: string;
  active = false;
}
