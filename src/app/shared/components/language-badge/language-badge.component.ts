import { Component, HostBinding, Input } from '@angular/core';
import { NgIf } from '@angular/common';
import { languageMap } from '../../misc/language-map';

@Component({
  selector: 'app-language-badge',
  imports: [NgIf],
  templateUrl: './language-badge.component.html',
  styleUrl: './language-badge.component.scss',
})
export class LanguageBadgeComponent {
  /** ISO 639-2/B language code, e.g. "cze", "eng". Used as label fallback and for flag lookup. */
  @Input({ required: true }) lang!: string;
  /** Optional explicit image URL. When provided, skips the languageMap lookup. */
  @Input() src: string | null = null;
  /** Size in pixels for both flag width and circle diameter. Default: 16 */
  @Input() size = 16;
  /** Applies border-radius: 50% to the flag image */
  @Input() rounded = false;
  /** When true, circle border uses primary color instead of border-bright */
  @Input() active = false;

  @HostBinding('style.--badge-base-size') get badgeBaseSize() { return this.size + 'px'; }

  get flagSrc(): string | null {
    if (this.src) return this.src;
    const code = languageMap[this.lang];
    return code ? `/img/flag/${code}.svg` : null;
  }

  get label(): string {
    return this.lang.slice(0, 2).toUpperCase();
  }
}
