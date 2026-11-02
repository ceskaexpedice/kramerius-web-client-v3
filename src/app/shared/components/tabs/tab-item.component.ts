import { Component, Input, TemplateRef, ViewChild } from '@angular/core';
import { NgClass, NgIf } from '@angular/common';

@Component({
  selector: 'app-tab-item',
  template: `
    <ng-template #content>
      <ng-content></ng-content>
    </ng-template>
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
  ],
})
export class TabItemComponent {
  @Input() icon: string = '';
  @Input() id?: string;
  @Input() label!: string;
  @Input() onlyIcon: boolean = false;
  @Input() tooltip: string = '';
  /** Optional count/marker shown next to the tab label (e.g. number of results). */
  @Input() badge: string | number | null = null;
  @ViewChild('content', { static: true }) content!: TemplateRef<unknown>;
}
