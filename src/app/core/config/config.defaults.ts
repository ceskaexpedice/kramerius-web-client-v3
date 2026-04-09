import { AppConfiguration, HomepageSectionConfig } from './config.interfaces';

export const DEFAULT_CONFIG: AppConfiguration = {
  app: {
    code: 'cdk',
    name: 'Czech Digital Library',
    baseUrl: '',
    contactEmail: 'digitalniknihovna@mzk.cz'
  },
  api: {
    baseUrl: ''
  },
  i18n: {
    defaultLanguage: 'cs',
    fallbackLanguage: 'en',
    supportedLanguages: ['cs', 'en', 'sk', 'pl']
  },
  features: {
    keycloak: true,
    mapSearch: true,
    georef: true,
    ai: false,
    folders: true,
    librarySwitch: false
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
  licenses: [
    {
      id: 'public',
      accessType: 'open',
      isOnline: true,
      label: { cs: 'Volná díla', en: 'Public domain', sk: 'Voľné diela', pl: 'Domena publiczna' },
      actions: {
        pdf: true, print: true, jpeg: true, text: true, textMode: true,
        citation: true, metadata: true, share: true, selection: true, crop: true
      }
    },
    {
      id: 'dnnto',
      accessType: 'login',
      isOnline: true,
      label: { cs: 'Díla nedostupná na trhu - online', en: 'Out of Commerce Works - online', sk: 'Diela nedostupná na trhu - online', pl: 'Utwory niedostępne w handlu – online' },
      messagePages: [
        { key: 'default', page: { cs: 'local-config/mzk/html/licenses/dnnto.cs.html', en: 'local-config/mzk/html/licenses/dnnto.en.html' } },
        { key: 'notEligible', page: { cs: 'local-config/mzk/html/licenses/dnnto2.cs.html', en: 'local-config/mzk/html/licenses/dnnto2.en.html' } },
        { key: 'info', page: { cs: 'local-config/mzk/html/licenses/dnnto3.cs.html', en: 'local-config/mzk/html/licenses/dnnto3.en.html' } }
      ],
      instructionPage: { cs: 'local-config/mzk/html/licenses/dnnto.instruction.cs.html', en: 'local-config/mzk/html/licenses/dnnto.instruction.en.html' },
      actions: {
        pdf: false, print: false, jpeg: false, text: false, textMode: true,
        citation: true, metadata: true, share: true, selection: false, crop: false
      }
    },
    {
      id: 'dnntt',
      accessType: 'terminal',
      isOnline: false,
      label: { cs: 'Díla nedostupná na trhu - studovna', en: 'Out of Commerce Works - library terminal', sk: 'Diela nedostupná na trhu - študovňa', pl: 'Utwory niedostępne w handlu – terminal biblioteczny' },
      actions: {
        pdf: false, print: true, jpeg: false, text: true, textMode: true,
        citation: true, metadata: true, share: true, selection: false, crop: false
      }
    },
    {
      id: 'onsite',
      accessType: 'terminal',
      isOnline: false,
      label: { cs: 'Studovna', en: 'Studovna', sk: 'Študovňa', pl: 'Czytelnia' },
      actions: {
        pdf: false, print: true, jpeg: false, text: true, textMode: true,
        citation: true, metadata: true, share: true, selection: false, crop: false
      }
    }
  ],
  pages: [
    {
      id: 'about',
      label: { cs: 'O projektu', en: 'About', sk: 'O projekte', pl: 'O projekcie' },
      content: { cs: 'local-config/mzk/html/about/about.cs.html', en: 'local-config/mzk/html/about/about.en.html' },
      showInHeader: true
    },
    {
      id: 'terms',
      content: { cs: 'local-config/mzk/html/terms/terms.cs.html', en: 'local-config/mzk/html/terms/terms.en.html' }
    },
    {
      id: 'copyright',
      content: { cs: 'local-config/mzk/html/copyright/copyright.cs.html', en: 'local-config/mzk/html/copyright/copyright.en.html' }
    }
  ]
};

export const DEFAULT_HOME_SECTIONS: HomepageSectionConfig[] = [
  { type: 'periodicals', title: 'periodical' },
  { type: 'books', title: 'book' },
  { type: 'genres', title: 'genres' },
  { type: 'document-types', title: 'document-types' }
];
