import { AppConfiguration, HomepageSectionConfig } from './config.interfaces';

export const DEFAULT_CONFIG: AppConfiguration = {
  app: {
    code: 'cdk',
    name: 'Czech Digital Library',
    version: '3.0.0',
    baseUrl: '',
    contactEmail: 'digitalniknihovna@mzk.cz'
  },
  api: {
    baseUrl: '',
    clientVersion: '7.0'
  },
  i18n: {
    defaultLanguage: 'cs',
    fallbackLanguage: 'en',
    supportedLanguages: ['cs', 'en', 'sk', 'pl']
  },
  features: {
    advancedSearch: true,
    iiif: true,
    mapSearch: true,
    georef: true,
    ai: false,
    folders: true,
    crossOrigin: true
  },
  ui: {
    cookiebar: true
  },
  viewer: {
    defaultMode: 'book',
    availableModes: ['book', 'single'],
    rememberLastMode: true,
    controls: {
      zoomIn: true,
      zoomOut: true,
      fullscreen: true,
      fitToScreen: true,
      fitToWidth: true,
      scrollMode: true,
      bookMode: true,
      rotate: true,
      selectArea: true
    },
    selectionControls: {
      text: true,
      export: true,
      share: true
    }
  },
  licenses: {
    public: {
      id: 'public',
      accessType: 'open',
      isOnline: true,
      label: { cs: 'Volná díla', en: 'Public domain', sk: 'Voľné diela', pl: 'Domena publiczna' },
      actions: {
        pdf: true, print: true, jpeg: true, text: true, textMode: true,
        citation: true, metadata: true, share: true, selection: true, crop: true
      }
    },
    dnnto: {
      id: 'dnnto',
      accessType: 'login',
      isOnline: true,
      label: { cs: 'Díla nedostupná na trhu - online', en: 'Out of Commerce Works - online', sk: 'Diela nedostupná na trhu - online', pl: 'Utwory niedostępne w handlu – online' },
      messagePage: { cs: 'local-config/html/licenses/dnnto.cs.html', en: 'local-config/html/licenses/dnnto.en.html' },
      instructionPage: { cs: 'local-config/html/licenses/dnnto.instruction.cs.html', en: 'local-config/html/licenses/dnnto.instruction.en.html' },
      actions: {
        pdf: false, print: false, jpeg: false, text: false, textMode: true,
        citation: true, metadata: true, share: true, selection: false, crop: false
      }
    },
    dnntt: {
      id: 'dnntt',
      accessType: 'terminal',
      isOnline: false,
      label: { cs: 'Díla nedostupná na trhu - studovna', en: 'Out of Commerce Works - library terminal', sk: 'Diela nedostupná na trhu - študovňa', pl: 'Utwory niedostępne w handlu – terminal biblioteczny' },
      actions: {
        pdf: false, print: true, jpeg: false, text: true, textMode: true,
        citation: true, metadata: true, share: true, selection: false, crop: false
      }
    },
    onsite: {
      id: 'onsite',
      accessType: 'terminal',
      isOnline: false,
      label: { cs: 'Studovna', en: 'Studovna', sk: 'Študovňa', pl: 'Czytelnia' },
      actions: {
        pdf: false, print: true, jpeg: false, text: true, textMode: true,
        citation: true, metadata: true, share: true, selection: false, crop: false
      }
    }
  },
  contentPages: {
    termsPage: { cs: 'local-config/html/terms/terms.cs.html', en: 'local-config/html/terms/terms.en.html' },
    aboutPage: { cs: 'local-config/html/about/about.cs.html', en: 'local-config/html/about/about.en.html' },
    copyrightedText: { cs: 'local-config/html/copyright/copyright.cs.html', en: 'local-config/html/copyright/copyright.en.html' }
  }
};

export const DEFAULT_HOME_SECTIONS: HomepageSectionConfig[] = [
  { type: 'periodicals', title: 'periodical' },
  { type: 'books', title: 'book' },
  { type: 'genres', title: 'genres' },
  { type: 'document-types', title: 'document-types' }
];
