import { AppConfiguration, HomepageSectionConfig } from './config.interfaces';

export const DEFAULT_CONFIG: AppConfiguration = {
  app: {
    code: 'cdk',
    name: 'Czech Digital Library',
    contactEmail: 'info@ceskadigitalniknihovna.cz'
  },
  api: {
    baseUrl: '',
    georefUrl: 'https://api.georeference.trinera.cloud/georefs/latest'
  },
  i18n: {
    defaultLanguage: 'cs',
    fallbackLanguage: 'en',
    supportedLanguages: ['cs', 'en', 'sk', 'pl']
  },
  features: {
    keycloak: true,
    mapSearch: true,
    mapProvider: 'allmaps',
    georef: true,
    ai: true,
    folders: true,
    librarySwitch: true
  },
  ui: {
    cookiebar: true
  },
  export: {
    print: true,
    jpeg: true,
    pdf: true,
    epub: true,
    txt: true,
    enrichWithAI: true
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
      messagePages: [
        { key: 'unauthenticated', page: { cs: 'local-config/cdk/html/licenses/public.cs.html', en: 'local-config/cdk/html/licenses/public.en.html' } }
      ],
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
        { key: 'unauthenticated', page: { cs: 'local-config/cdk/html/licenses/dnnto.cs.html', en: 'local-config/cdk/html/licenses/dnnto.en.html' } },
        { key: 'unauthorized', page: { cs: 'local-config/cdk/html/licenses/dnnto2.cs.html', en: 'local-config/cdk/html/licenses/dnnto2.en.html' } },
        { key: 'available', page: { cs: 'local-config/cdk/html/licenses/dnnto3.cs.html', en: 'local-config/cdk/html/licenses/dnnto3.en.html' } }
      ],
      instructionPage: { cs: 'local-config/cdk/html/licenses/dnnto.instruction.cs.html', en: 'local-config/cdk/html/licenses/dnnto.instruction.en.html' },
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
      messagePages: [
        { key: 'unauthenticated', page: { cs: 'local-config/cdk/html/licenses/dnntt.cs.html', en: 'local-config/cdk/html/licenses/dnntt.en.html' } }
      ],
      instructionPage: { cs: 'local-config/cdk/html/licenses/dnntt.instruction.cs.html', en: 'local-config/cdk/html/licenses/dnntt.instruction.en.html' },
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
      messagePages: [
        { key: 'unauthenticated', page: { cs: 'local-config/cdk/html/licenses/onsite.cs.html', en: 'local-config/cdk/html/licenses/onsite.en.html' } }
      ],
      instructionPage: { cs: 'local-config/cdk/html/licenses/onsite.instruction.cs.html', en: 'local-config/cdk/html/licenses/onsite.instruction.en.html' },
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
      content: { cs: 'local-config/cdk/html/about/about.cs.html', en: 'local-config/cdk/html/about/about.en.html' },
      showInHeader: true
    },
    {
      id: 'terms',
      content: {
        cs: ['local-config/cdk/html/terms/terms.cs.html', 'local-config/cdk/html/terms/terms2.cs.html'],
        en: ['local-config/cdk/html/terms/terms.en.html', 'local-config/cdk/html/terms/terms2.en.html']
      }
    },
    {
      id: 'copyright',
      content: { cs: 'local-config/cdk/html/copyright/copyright.cs.html', en: 'local-config/cdk/html/copyright/copyright.en.html' }
    }
  ]
};

export const DEFAULT_HOME_SECTIONS: HomepageSectionConfig[] = [
  { type: 'periodicals', title: 'periodical' },
  { type: 'books', title: 'book' },
  { type: 'genres', title: 'genres' },
  { type: 'document-types', title: 'document-types' }
];
