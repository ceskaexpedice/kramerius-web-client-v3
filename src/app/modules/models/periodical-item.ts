export interface PeriodicalItem {
  uuid: string;
  title: string;
  dateRange: string;
  accessibility: string;
  licenses: string[];
  publishers?: string[];
  publicationPlaces?: string[];
  languages?: string[];
  keywords?: string[];
  geographicNames?: string[];
  genres?: string[];
  shelfLocators?: string[];
  created?: string;
  modified?: string;
  hasTiles?: boolean;
}
