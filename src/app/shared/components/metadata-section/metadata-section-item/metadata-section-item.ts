import { Component, ElementRef, Input, ViewChild, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { NgForOf, NgIf } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';

export type MetadataItemType = 'text' | 'list' | 'clickable-list' | 'badge' | 'key-value';

@Component({
  selector: 'app-metadata-section-item',
  imports: [NgIf, NgForOf, TranslatePipe],
  templateUrl: './metadata-section-item.html',
  styleUrl: './metadata-section-item.scss'
})
export class MetadataSectionItem implements AfterViewInit {

  @Input() label: string = '';
  @Input() type: MetadataItemType = 'text';
  @Input() value?: string;
  @Input() items?: any[];
  @Input() keyValuePairs?: { [key: string]: any };
  @Input() displayFn?: (item: any) => string;
  @Input() onItemClick?: (item: any) => void;
  @Input() showListBullets: boolean = false;
  @Input() icon?: string;
  @Input() listKeyUppercase: boolean = false;
  @Input() disableTranslate: boolean = false;
  @Input() collapsible: boolean = false;

  @ViewChild('contentRef') contentRef!: ElementRef<HTMLDivElement>;

  isCollapsed: boolean = true;
  isOverflowing: boolean = false;

  constructor(private cdr: ChangeDetectorRef) {}

  ngAfterViewInit(): void {
    if (this.collapsible) {
      this.checkOverflow();
    }
  }

  private checkOverflow(): void {
    const el = this.contentRef?.nativeElement;
    if (!el) return;

    // Temporarily remove clamp to get the real scrollHeight
    el.style.webkitLineClamp = 'unset';
    el.style.overflow = 'visible';
    const fullHeight = el.scrollHeight;
    el.style.webkitLineClamp = '';
    el.style.overflow = '';

    const lineHeight = parseFloat(getComputedStyle(el).lineHeight) || 20;
    this.isOverflowing = fullHeight > lineHeight * 3 + 1;
    this.cdr.detectChanges();
  }

  toggleCollapse(): void {
    this.isCollapsed = !this.isCollapsed;
  }

  getDisplayText(item: any): string {
    if (this.displayFn) {
      return this.displayFn(item);
    }
    return typeof item === 'string' ? item : String(item);
  }

  handleClick(item: any): void {
    if (this.onItemClick) {
      this.onItemClick(item);
    }
  }

  getKeys(): string[] {
    if (!this.keyValuePairs) {
      return [];
    }
    return Object.keys(this.keyValuePairs).filter(key => {
      const value = this.keyValuePairs![key];
      return value !== null && value !== undefined && value !== '' &&
        !(Array.isArray(value) && value.length === 0);
    });
  }

  getKeyValue(key: string): string {
    if (!this.keyValuePairs) {
      return '';
    }
    const value = this.keyValuePairs[key];
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    return String(value);
  }

}
