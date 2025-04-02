export interface FacetItem {
  name: string;
  count: number;
}

export const parseFacetField = (raw: any[]): FacetItem[] => {
  const items: FacetItem[] = [];
  for (let i = 0; i < raw.length; i += 2) {
    items.push({ name: raw[i], count: raw[i + 1] });
  }
  return items;
};
