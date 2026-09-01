export interface FacetItemIcon {
  /** CSS class for the icon element (own icon font, or `material-icons`). */
  icon: string;
  /**
   * Material Icons ligature name, rendered as the element's text content.
   * Set only for Material icons; own-font glyphs carry everything in `icon`.
   */
  materialIcon?: string;
  iconClass?: string;
}

export interface FacetItem {
  name: string;
  count: number;
  icon?: string;
  /** Material Icons ligature name; see FacetItemIcon.materialIcon. */
  materialIcon?: string;
  iconClass?: string;
  icons?: FacetItemIcon[];
  label?: string;
  available?: boolean;
  type?: 'radio' | 'checkbox';
  tooltipIcon?: string;
  tooltipText?: string;
  colorDot?: string;
}

export interface FacetGroup {
  type: 'radio' | 'checkbox';
  items: FacetItem[];
}

export const parseFacetField = (raw: any[]): FacetItem[] => {
  const items: FacetItem[] = [];
  for (let i = 0; i < raw.length; i += 2) {
    items.push({ name: raw[i], count: raw[i + 1] });
  }
  return items;
};
