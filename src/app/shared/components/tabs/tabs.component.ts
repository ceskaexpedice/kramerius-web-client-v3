import { Component, ContentChildren, ElementRef, EventEmitter, Input, Output, QueryList, signal, OnChanges, SimpleChanges, ViewChildren } from '@angular/core';
import { TabItemComponent } from './tab-item.component';
import { NgTemplateOutlet } from '@angular/common';
import { CdkTooltipDirective } from '../../directives';

let nextTabsId = 0;

@Component({
  selector: 'app-tabs',
  imports: [
    NgTemplateOutlet,
    CdkTooltipDirective,
  ],
  templateUrl: './tabs.component.html',
  styleUrl: './tabs.component.scss'
})
export class TabsComponent implements OnChanges {

  @Input() noPadding = false;
  @Input() headerBackground: 'transparent' | 'base' | 'light' = 'transparent';
  /** 'default' renders icon + label inline (or icon only); 'stacked' renders a small label under the icon. */
  @Input() variant: 'default' | 'stacked' = 'default';
  /** Accessible name of the tablist. */
  @Input() ariaLabel = '';

  @ViewChildren('tabButton') tabButtons!: QueryList<ElementRef<HTMLButtonElement>>;

  private readonly uid = `app-tabs-${nextTabsId++}`;
  readonly panelId = `${this.uid}-panel`;

  tabId(index: number): string {
    return `${this.uid}-tab-${index}`;
  }

  /** WAI-ARIA tabs pattern: arrows move between tabs (automatic activation), Home/End jump to the ends. */
  onTablistKeydown(event: KeyboardEvent): void {
    const count = this.tabs().length;
    if (!count) return;
    let next: number | null = null;
    const current = this.activeTabIndex();
    switch (event.key) {
      case 'ArrowRight': next = (current + 1) % count; break;
      case 'ArrowLeft': next = (current - 1 + count) % count; break;
      case 'Home': next = 0; break;
      case 'End': next = count - 1; break;
    }
    if (next === null) return;
    event.preventDefault();
    event.stopPropagation();
    this.selectTab(next);
    this.tabButtons.get(next)?.nativeElement.focus();
  }

  @ContentChildren(TabItemComponent) tabQueryList!: QueryList<TabItemComponent>;
  tabs = signal<TabItemComponent[]>([]);
  activeTabIndex = signal(0);
  @Output() tabChanged = new EventEmitter<string>();

  @Input() initialTab?: string;

  ngAfterContentInit(): void {
    this.updateTabs();

    this.tabQueryList.changes.subscribe(() => {
      this.updateTabs();
    });
  }

  private updateTabs(): void {
    const tabsArray = this.tabQueryList.toArray();
    this.tabs.set(tabsArray);

    if (tabsArray.length > 0) {
      // Clamp active index if tabs were removed
      if (this.activeTabIndex() >= tabsArray.length) {
        this.activeTabIndex.set(0);
      }
      if (this.initialTab) {
        this.selectTabByIdOrLabel(this.initialTab);
      } else if (!tabsArray[this.activeTabIndex()]) {
        this.activeTabIndex.set(0);
        this.emitTabChange(tabsArray[0]);
      }
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['initialTab'] && !changes['initialTab'].firstChange) {
      if (this.tabs().length > 0 && this.initialTab) {
        this.selectTabByIdOrLabel(this.initialTab);
      }
    }
  }

  selectTab(index: number): void {
    const selectedTab = this.tabs()[index];
    if (selectedTab) {
      this.activeTabIndex.set(index);
      this.emitTabChange(selectedTab);
    }
  }

  private emitTabChange(tab: TabItemComponent) {
    this.tabChanged.emit(tab.id || tab.label);
  }

  selectTabByIdOrLabel(identifier: string): void {
    const tabsArray = this.tabs();
    const index = tabsArray.findIndex(tab => (tab.id === identifier) || (tab.label === identifier));
    if (index !== -1) {
      this.selectTab(index);
    } else if (tabsArray.length > 0 && this.activeTabIndex() === -1) {
      // Fallback to first tab if requested identifier not found and no tab selected
      this.selectTab(0);
    }
  }
}
