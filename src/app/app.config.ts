import { InjectionToken } from '@angular/core';

export const ENVIRONMENT = {
  production: false,
  apiUrl: 'https://dev-api.example.com',
  enableDebug: true,
  availableLanguages: ['cs', 'en', 'sk', 'pl'],
  defaultLanguage: 'cs',
  fallbackLanguage: 'en',
  dateRangeStartYear: 1162,
  translationVersion: '2.1.3',
  contactEmail: 'info@ceskadigitalniknihovna.cz'
};

export const API_URL = new InjectionToken<string>('API_URL');
export const DEFAULT_LANGUAGE = new InjectionToken<string>('DEFAULT_LANGUAGE');
