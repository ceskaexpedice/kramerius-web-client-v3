export interface FacetItemIcon {
  icon: string;
  iconClass?: string;
}

export interface FacetItem {
  name: string;
  count: number;
  icon?: string;
  iconClass?: string;
  icons?: FacetItemIcon[];
  label?: string;
  available?: boolean;
  type?: 'radio' | 'checkbox';
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
