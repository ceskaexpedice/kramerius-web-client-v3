import {Component, ContentChildren, QueryList, signal} from '@angular/core';
import {TabItemComponent} from './tab-item.component';
import {NgForOf, NgIf, NgTemplateOutlet} from '@angular/common';

@Component({
  selector: 'app-tabs',
  imports: [
    NgForOf,
    NgIf,
    NgTemplateOutlet,
  ],
  templateUrl: './tabs.component.html',
  styleUrl: './tabs.component.scss'
})
export class TabsComponent {
  @ContentChildren(TabItemComponent) tabQueryList!: QueryList<TabItemComponent>;
  tabs: TabItemComponent[] = [];
  activeTabIndex = signal(0);

  ngAfterContentInit(): void {
    this.tabs = this.tabQueryList.toArray();
  }

  selectTab(index: number): void {
    this.activeTabIndex.set(index);
  }
}
