import { Component, ContentChildren, EventEmitter, Input, Output, QueryList, signal } from '@angular/core';
import { TabItemComponent } from './tab-item.component';
import { NgForOf, NgTemplateOutlet } from '@angular/common';
import { CdkTooltipDirective } from '../../directives';

@Component({
  selector: 'app-tabs',
  imports: [
    NgForOf,
    NgTemplateOutlet,
    CdkTooltipDirective,
  ],
  templateUrl: './tabs.component.html',
  styleUrl: './tabs.component.scss'
})
export class TabsComponent {

  @ContentChildren(TabItemComponent) tabQueryList!: QueryList<TabItemComponent>;
  tabs: TabItemComponent[] = [];
  activeTabIndex = signal(0);
  @Output() tabChanged = new EventEmitter<string>();

  @Input() initialTab?: string;

  ngAfterContentInit(): void {
    this.tabs = this.tabQueryList.toArray();

    if (this.tabs.length > 0) {
      if (this.initialTab) {
        this.selectTabByIdOrLabel(this.initialTab);
      } else {
        this.activeTabIndex.set(0);
        this.emitTabChange(this.tabs[0]);
      }
    }
  }

  selectTab(index: number): void {
    const selectedTab = this.tabs[index];
    if (selectedTab) {
      this.activeTabIndex.set(index);
      this.emitTabChange(selectedTab);
    }
  }

  private emitTabChange(tab: TabItemComponent) {
    this.tabChanged.emit(tab.id || tab.label);
  }

  selectTabByIdOrLabel(identifier: string): void {
    const index = this.tabs.findIndex(tab => (tab.id === identifier) || (tab.label === identifier));
    if (index !== -1) {
      this.selectTab(index);
    } else if (this.tabs.length > 0 && this.activeTabIndex() === -1) {
      // Fallback to first tab if requested identifier not found and no tab selected
      this.selectTab(0);
    }
  }
}
