import { Component, Input, TemplateRef } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { CollapsibleContent } from '../collapsible-content/collapsible-content';
import { NamespacedTranslatePipe } from '../../../pipes/namespaced-translate.pipe';

export type MetadataItemType = 'text' | 'list' | 'clickable-list' | 'badge' | 'key-value';

import { CopyButtonComponent } from '../../copy-button/copy-button.component';

@Component({
  selector: 'app-metadata-section-item',
  imports: [NgTemplateOutlet, TranslatePipe, NamespacedTranslatePipe, CollapsibleContent, CopyButtonComponent],
  templateUrl: './metadata-section-item.html',
  styleUrl: './metadata-section-item.scss'
})
export class MetadataSectionItem {

  @Input() label: string = '';
  /** Keep the label for assistive tech only (e.g. it repeats the group heading). */
  @Input() hideLabel = false;
  /** Show a copy-to-clipboard button next to text / key-value values (identifiers). */
  @Input() copyable = false;
  /**
   * Run text, list and key-value values through the translate pipe. Off by
   * default: these are bibliographic data, and a value that happens to equal a
   * translation key must not be silently replaced.
   */
  @Input() translateValues = false;

  private static readonly KEY_LABELS: Record<string, string> = {
    urnnbn: 'URN:NBN', ccnb: 'ČNB', oclc: 'OCLC', doi: 'DOI', bcbt: 'BCBT', uuid: 'UUID',
    issn: 'ISSN', isbn: 'ISBN', ismn: 'ISMN', sysno: 'SYSNO',
  };

  /** Human label of an identifier key: "urnnbn" → "URN:NBN". */
  formatKey(key: string): string {
    const known = MetadataSectionItem.KEY_LABELS[key.toLowerCase()];
    if (known) return known;
    return this.listKeyUppercase ? key.toUpperCase() : key;
  }

  private static nextId = 0;
  readonly labelId = `metadata-item-label-${MetadataSectionItem.nextId++}`;
  @Input() type: MetadataItemType = 'text';
  @Input() value?: string;
  @Input() items?: any[];
  @Input() keyValuePairs?: { [key: string]: any };
  @Input() displayFn?: (item: any) => string;
  /**
   * Optional secondary line rendered under a clickable-list item: plain,
   * non-interactive text (e.g. a shelf locator under its holding library) that
   * must not inherit the item's link styling or click target.
   */
  @Input() itemSubtextFn?: (item: any) => string | null | undefined;
  @Input() onItemClick?: (item: any) => void;
  /**
   * When set, each clickable item (clickable-list / badge) renders as a real
   * `<a href>` so it can be opened in a new tab. A plain left-click is still
   * handled in-app via `onItemClick`; modifier/middle clicks follow the href.
   */
  @Input() itemHref?: (item: any) => string | null | undefined;
  /**
   * Bulleted lists are the panel-wide default so every multi-value section
   * (keywords, languages, genres, notes, …) shares one indentation and marker.
   * Set to false only for a section that must render flush, e.g. a single
   * free-text block that would look odd with a bullet.
   */
  @Input() showListBullets: boolean = true;
  @Input() icon?: string;
  @Input() listKeyUppercase: boolean = false;
  @Input() disableTranslate: boolean = false;
  /**
   * When set, list/clickable-list items are translated within this namespace
   * (e.g. 'language' -> key 'language-{code}'), falling back to the raw value
   * when no translation exists. Avoids collisions with the global namespace.
   */
  @Input() translateNamespace?: string;
  @Input() collapsible: boolean = false;
  @Input() itemSuffixTpl?: TemplateRef<{ $implicit: any }>;
  /** Optional custom renderer for each item of a `type="list"` list. */
  @Input() itemTpl?: TemplateRef<{ $implicit: any }>;
  /** Entries shown before "Show all (N)"; overrides LIST_PREVIEW (e.g. authors). */
  @Input() maxItems?: number;
  @Input() headerActionLabel?: string;
  @Input() headerActionClick?: () => void;

  /** Collapsible lists show this many whole entries before "Show all (N)". */
  static readonly LIST_PREVIEW = 3;
  listExpanded = false;

  private get listPreview(): number | null {
    if (this.type !== 'list' && this.type !== 'clickable-list') return null;
    if (this.maxItems) return this.maxItems;
    return this.collapsible ? MetadataSectionItem.LIST_PREVIEW : null;
  }

  /**
   * Lists (plain and clickable) are clamped by entries, not lines: a line clamp
   * cut the last entry in half and its "more" did not say how much was hidden.
   */
  get listClamped(): boolean {
    const preview = this.listPreview;
    return preview !== null && (this.items?.length ?? 0) > preview;
  }

  get listItems(): any[] {
    if (!this.items) return [];
    return this.listClamped && !this.listExpanded
      ? this.items.slice(0, this.listPreview!)
      : this.items;
  }

  /**
   * Line clamping (collapsible-content) for text and short lists (e.g. one long
   * abstract); lists with more entries than the preview clamp by entries instead.
   */
  get lineClamp(): boolean {
    return this.collapsible && !this.listClamped;
  }

  /**
   * Bullets are only drawn once a section holds more than one value — a lone
   * value reads as a plain paragraph, so it renders flush with the label
   * instead of hanging off a marker. `showListBullets` can still opt out
   * entirely.
   */
  get bulletsVisible(): boolean {
    if (!this.showListBullets) return false;
    const count = this.type === 'key-value' ? this.getKeys().length : (this.items?.length ?? 0);
    return count > 1;
  }

  handleHeaderAction(event: Event): void {
    event.stopPropagation();
    if (this.headerActionClick) {
      this.headerActionClick();
    }
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

  getItemHref(item: any): string | null {
    return this.itemHref?.(item) ?? null;
  }

  getItemSubtext(item: any): string | null {
    const subtext = this.itemSubtextFn?.(item);
    return subtext ? subtext : null;
  }

  /**
   * An item is only presented as interactive when there is somewhere to go.
   * With `itemHref` supplied it is the authority per item, so an item it
   * declines (e.g. a location with no searchable institution) renders as plain
   * text rather than a focusable control that does nothing. Without it, the
   * section relies on `onItemClick` for every item alike.
   */
  isItemInteractive(item: any): boolean {
    return this.itemHref ? !!this.getItemHref(item) : !!this.onItemClick;
  }

  /**
   * Keyboard/click on the <li>. When the item has an href it's rendered as an
   * inner <a> that owns navigation, so the <li> handler is a no-op; otherwise
   * the <li> is the interactive element and fires the in-app handler.
   */
  handleItemClick(item: any): void {
    if (this.getItemHref(item)) return;
    this.handleClick(item);
  }

  handleItemSpace(event: Event, item: any): void {
    if (this.getItemHref(item)) return;
    event.preventDefault();
    this.handleClick(item);
  }

  /**
   * Left-click on an item link: run the in-app handler and suppress the default
   * navigation. Modifier / middle clicks fall through so the browser opens the
   * href in a new tab as usual.
   */
  handleLinkClick(event: MouseEvent, item: any): void {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) {
      return;
    }
    event.preventDefault();
    this.handleClick(item);
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
