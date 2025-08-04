import {Component, ContentChildren, EventEmitter, Output, QueryList, signal} from '@angular/core';
import {TabItemComponent} from './tab-item.component';
import {NgForOf, NgTemplateOutlet} from '@angular/common';

@Component({
  selector: 'app-tabs',
  imports: [
    NgForOf,
    NgTemplateOutlet,
  ],
  templateUrl: './tabs.component.html',
  styleUrl: './tabs.component.scss'
})
export class TabsComponent {

  @ContentChildren(TabItemComponent) tabQueryList!: QueryList<TabItemComponent>;
  tabs: TabItemComponent[] = [];
  activeTabIndex = signal(0);
  @Output() tabChanged = new EventEmitter<string>();

  ngAfterContentInit(): void {
    this.tabs = this.tabQueryList.toArray();

    if (this.tabs.length > 0) {
      this.activeTabIndex.set(0);
      this.tabChanged.emit(this.tabs[0].label);
    }
  }

  selectTab(index: number): void {
    this.activeTabIndex.set(index);
    const selectedTab = this.tabs[index];
    if (selectedTab) {
      this.tabChanged.emit(selectedTab.label);
    }
  }
}
