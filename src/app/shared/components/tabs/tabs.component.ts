import {Component, ContentChildren, QueryList} from '@angular/core';
import {TabItemComponent} from './tab-item.component';
import {NgForOf} from '@angular/common';

@Component({
  selector: 'app-tabs',
  imports: [
    NgForOf,
  ],
  templateUrl: './tabs.component.html',
  styleUrl: './tabs.component.scss'
})
export class TabsComponent {
  @ContentChildren(TabItemComponent) tabs!: QueryList<TabItemComponent>;
  activeTabIndex = 0;

  ngAfterContentInit(): void {
    this.selectTab(0);
  }

  selectTab(index: number): void {
    this.activeTabIndex = index;
    this.tabs.forEach((tab, i) => tab.active = i === index);
  }
}
