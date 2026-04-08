export interface TtsVoiceOption {
  name: string;
  code: string;
  gender: string;
  provider: 'openai' | 'google' | 'elevenlabs';
}

export interface VoiceGroup {
  provider: string;
  voices: TtsVoiceOption[];
}

export const OPENAI_VOICES: TtsVoiceOption[] = [
  { name: 'Fable', code: 'fable', gender: 'F', provider: 'openai' },
  { name: 'Alloy', code: 'alloy', gender: 'F', provider: 'openai' },
  { name: 'Echo', code: 'echo', gender: 'M', provider: 'openai' },
  { name: 'Onyx', code: 'onyx', gender: 'M', provider: 'openai' },
  { name: 'Nova', code: 'nova', gender: 'F', provider: 'openai' },
  { name: 'Shimmer', code: 'shimmer', gender: 'F', provider: 'openai' },
];

export const GOOGLE_VOICES: Record<string, TtsVoiceOption[]> = {
  cs: [
    { name: 'cs-CZ-Standard-A', code: 'cs-CZ-Standard-A', gender: 'F', provider: 'google' },
    { name: 'cs-CZ-Wavenet-A', code: 'cs-CZ-Wavenet-A', gender: 'F', provider: 'google' },
  ],
  sk: [
    { name: 'sk-SK-Standard-A', code: 'sk-SK-Standard-A', gender: 'F', provider: 'google' },
    { name: 'sk-SK-Wavenet-A', code: 'sk-SK-Wavenet-A', gender: 'F', provider: 'google' },
  ],
  en: [
    { name: 'en-US-Casual-K', code: 'en-US-Casual-K', gender: 'M', provider: 'google' },
    { name: 'en-US-Journey-D', code: 'en-US-Journey-D', gender: 'M', provider: 'google' },
    { name: 'en-US-Journey-F', code: 'en-US-Journey-F', gender: 'F', provider: 'google' },
    { name: 'en-US-Neural2-A', code: 'en-US-Neural2-A', gender: 'M', provider: 'google' },
    { name: 'en-US-Neural2-C', code: 'en-US-Neural2-C', gender: 'F', provider: 'google' },
    { name: 'en-US-Neural2-D', code: 'en-US-Neural2-D', gender: 'M', provider: 'google' },
    { name: 'en-US-Neural2-E', code: 'en-US-Neural2-E', gender: 'F', provider: 'google' },
    { name: 'en-US-Neural2-F', code: 'en-US-Neural2-F', gender: 'F', provider: 'google' },
    { name: 'en-US-Neural2-G', code: 'en-US-Neural2-G', gender: 'F', provider: 'google' },
    { name: 'en-US-Neural2-H', code: 'en-US-Neural2-H', gender: 'F', provider: 'google' },
    { name: 'en-US-Neural2-I', code: 'en-US-Neural2-I', gender: 'M', provider: 'google' },
    { name: 'en-US-Neural2-J', code: 'en-US-Neural2-J', gender: 'M', provider: 'google' },
    { name: 'en-US-News-K', code: 'en-US-News-K', gender: 'F', provider: 'google' },
    { name: 'en-US-News-L', code: 'en-US-News-L', gender: 'F', provider: 'google' },
    { name: 'en-US-News-N', code: 'en-US-News-N', gender: 'M', provider: 'google' },
    { name: 'en-US-Polyglot-1', code: 'en-US-Polyglot-1', gender: 'M', provider: 'google' },
    { name: 'en-US-Standard-A', code: 'en-US-Standard-A', gender: 'M', provider: 'google' },
    { name: 'en-US-Standard-B', code: 'en-US-Standard-B', gender: 'M', provider: 'google' },
    { name: 'en-US-Standard-C', code: 'en-US-Standard-C', gender: 'F', provider: 'google' },
    { name: 'en-US-Standard-D', code: 'en-US-Standard-D', gender: 'M', provider: 'google' },
    { name: 'en-US-Standard-E', code: 'en-US-Standard-E', gender: 'F', provider: 'google' },
    { name: 'en-US-Standard-F', code: 'en-US-Standard-F', gender: 'F', provider: 'google' },
    { name: 'en-US-Standard-G', code: 'en-US-Standard-G', gender: 'F', provider: 'google' },
    { name: 'en-US-Standard-H', code: 'en-US-Standard-H', gender: 'F', provider: 'google' },
    { name: 'en-US-Standard-I', code: 'en-US-Standard-I', gender: 'M', provider: 'google' },
    { name: 'en-US-Standard-J', code: 'en-US-Standard-J', gender: 'M', provider: 'google' },
    { name: 'en-US-Studio-O', code: 'en-US-Studio-O', gender: 'F', provider: 'google' },
    { name: 'en-US-Studio-Q', code: 'en-US-Studio-Q', gender: 'M', provider: 'google' },
    { name: 'en-US-Wavenet-A', code: 'en-US-Wavenet-A', gender: 'M', provider: 'google' },
    { name: 'en-US-Wavenet-B', code: 'en-US-Wavenet-B', gender: 'M', provider: 'google' },
    { name: 'en-US-Wavenet-C', code: 'en-US-Wavenet-C', gender: 'F', provider: 'google' },
    { name: 'en-US-Wavenet-D', code: 'en-US-Wavenet-D', gender: 'M', provider: 'google' },
    { name: 'en-US-Wavenet-E', code: 'en-US-Wavenet-E', gender: 'F', provider: 'google' },
    { name: 'en-US-Wavenet-F', code: 'en-US-Wavenet-F', gender: 'F', provider: 'google' },
    { name: 'en-US-Wavenet-G', code: 'en-US-Wavenet-G', gender: 'F', provider: 'google' },
    { name: 'en-US-Wavenet-H', code: 'en-US-Wavenet-H', gender: 'F', provider: 'google' },
    { name: 'en-US-Wavenet-I', code: 'en-US-Wavenet-I', gender: 'M', provider: 'google' },
    { name: 'en-US-Wavenet-J', code: 'en-US-Wavenet-J', gender: 'M', provider: 'google' },
    { name: 'en-GB-Neural2-A', code: 'en-GB-Neural2-A', gender: 'F', provider: 'google' },
    { name: 'en-GB-Neural2-B', code: 'en-GB-Neural2-B', gender: 'M', provider: 'google' },
    { name: 'en-GB-Neural2-C', code: 'en-GB-Neural2-C', gender: 'F', provider: 'google' },
    { name: 'en-GB-Neural2-D', code: 'en-GB-Neural2-D', gender: 'M', provider: 'google' },
    { name: 'en-GB-Neural2-F', code: 'en-GB-Neural2-F', gender: 'F', provider: 'google' },
    { name: 'en-GB-News-G', code: 'en-GB-News-G', gender: 'F', provider: 'google' },
    { name: 'en-GB-News-H', code: 'en-GB-News-H', gender: 'F', provider: 'google' },
    { name: 'en-GB-News-I', code: 'en-GB-News-I', gender: 'F', provider: 'google' },
    { name: 'en-GB-News-J', code: 'en-GB-News-J', gender: 'M', provider: 'google' },
    { name: 'en-GB-News-K', code: 'en-GB-News-K', gender: 'M', provider: 'google' },
    { name: 'en-GB-News-L', code: 'en-GB-News-L', gender: 'M', provider: 'google' },
    { name: 'en-GB-News-M', code: 'en-GB-News-M', gender: 'M', provider: 'google' },
    { name: 'en-GB-Standard-A', code: 'en-GB-Standard-A', gender: 'F', provider: 'google' },
    { name: 'en-GB-Standard-B', code: 'en-GB-Standard-B', gender: 'M', provider: 'google' },
    { name: 'en-GB-Standard-C', code: 'en-GB-Standard-C', gender: 'F', provider: 'google' },
    { name: 'en-GB-Standard-D', code: 'en-GB-Standard-D', gender: 'M', provider: 'google' },
    { name: 'en-GB-Standard-F', code: 'en-GB-Standard-F', gender: 'F', provider: 'google' },
    { name: 'en-GB-Studio-B', code: 'en-GB-Studio-B', gender: 'M', provider: 'google' },
    { name: 'en-GB-Studio-C', code: 'en-GB-Studio-C', gender: 'F', provider: 'google' },
    { name: 'en-GB-Wavenet-A', code: 'en-GB-Wavenet-A', gender: 'F', provider: 'google' },
    { name: 'en-GB-Wavenet-B', code: 'en-GB-Wavenet-B', gender: 'M', provider: 'google' },
    { name: 'en-GB-Wavenet-C', code: 'en-GB-Wavenet-C', gender: 'F', provider: 'google' },
    { name: 'en-GB-Wavenet-D', code: 'en-GB-Wavenet-D', gender: 'M', provider: 'google' },
    { name: 'en-GB-Wavenet-F', code: 'en-GB-Wavenet-F', gender: 'F', provider: 'google' },
  ],
  pl: [
    { name: 'pl-PL-Standard-A', code: 'pl-PL-Standard-A', gender: 'F', provider: 'google' },
    { name: 'pl-PL-Standard-B', code: 'pl-PL-Standard-B', gender: 'M', provider: 'google' },
    { name: 'pl-PL-Wavenet-A', code: 'pl-PL-Wavenet-A', gender: 'F', provider: 'google' },
    { name: 'pl-PL-Wavenet-B', code: 'pl-PL-Wavenet-B', gender: 'M', provider: 'google' },
    { name: 'pl-PL-Wavenet-C', code: 'pl-PL-Wavenet-C', gender: 'M', provider: 'google' },
    { name: 'pl-PL-Wavenet-D', code: 'pl-PL-Wavenet-D', gender: 'F', provider: 'google' },
  ],
  de: [
    { name: 'de-DE-Neural2-A', code: 'de-DE-Neural2-A', gender: 'F', provider: 'google' },
    { name: 'de-DE-Neural2-B', code: 'de-DE-Neural2-B', gender: 'M', provider: 'google' },
    { name: 'de-DE-Neural2-C', code: 'de-DE-Neural2-C', gender: 'F', provider: 'google' },
    { name: 'de-DE-Neural2-D', code: 'de-DE-Neural2-D', gender: 'M', provider: 'google' },
    { name: 'de-DE-Neural2-F', code: 'de-DE-Neural2-F', gender: 'F', provider: 'google' },
    { name: 'de-DE-Polyglot-1', code: 'de-DE-Polyglot-1', gender: 'M', provider: 'google' },
    { name: 'de-DE-Standard-A', code: 'de-DE-Standard-A', gender: 'F', provider: 'google' },
    { name: 'de-DE-Standard-B', code: 'de-DE-Standard-B', gender: 'M', provider: 'google' },
    { name: 'de-DE-Standard-C', code: 'de-DE-Standard-C', gender: 'F', provider: 'google' },
    { name: 'de-DE-Standard-D', code: 'de-DE-Standard-D', gender: 'M', provider: 'google' },
    { name: 'de-DE-Standard-E', code: 'de-DE-Standard-E', gender: 'M', provider: 'google' },
    { name: 'de-DE-Standard-F', code: 'de-DE-Standard-F', gender: 'F', provider: 'google' },
    { name: 'de-DE-Studio-B', code: 'de-DE-Studio-B', gender: 'M', provider: 'google' },
    { name: 'de-DE-Studio-C', code: 'de-DE-Studio-C', gender: 'F', provider: 'google' },
    { name: 'de-DE-Wavenet-A', code: 'de-DE-Wavenet-A', gender: 'F', provider: 'google' },
    { name: 'de-DE-Wavenet-B', code: 'de-DE-Wavenet-B', gender: 'M', provider: 'google' },
    { name: 'de-DE-Wavenet-C', code: 'de-DE-Wavenet-C', gender: 'F', provider: 'google' },
    { name: 'de-DE-Wavenet-D', code: 'de-DE-Wavenet-D', gender: 'M', provider: 'google' },
    { name: 'de-DE-Wavenet-E', code: 'de-DE-Wavenet-E', gender: 'M', provider: 'google' },
    { name: 'de-DE-Wavenet-F', code: 'de-DE-Wavenet-F', gender: 'F', provider: 'google' },
  ],
  fr: [
    { name: 'fr-FR-Neural2-A', code: 'fr-FR-Neural2-A', gender: 'F', provider: 'google' },
    { name: 'fr-FR-Neural2-B', code: 'fr-FR-Neural2-B', gender: 'M', provider: 'google' },
    { name: 'fr-FR-Standard-A', code: 'fr-FR-Standard-A', gender: 'F', provider: 'google' },
    { name: 'fr-FR-Standard-B', code: 'fr-FR-Standard-B', gender: 'M', provider: 'google' },
    { name: 'fr-FR-Wavenet-A', code: 'fr-FR-Wavenet-A', gender: 'F', provider: 'google' },
    { name: 'fr-FR-Wavenet-B', code: 'fr-FR-Wavenet-B', gender: 'M', provider: 'google' },
    { name: 'fr-FR-Wavenet-C', code: 'fr-FR-Wavenet-C', gender: 'F', provider: 'google' },
    { name: 'fr-FR-Wavenet-D', code: 'fr-FR-Wavenet-D', gender: 'M', provider: 'google' },
  ],
  es: [
    { name: 'es-ES-Neural2-A', code: 'es-ES-Neural2-A', gender: 'F', provider: 'google' },
    { name: 'es-ES-Neural2-B', code: 'es-ES-Neural2-B', gender: 'M', provider: 'google' },
    { name: 'es-ES-Standard-A', code: 'es-ES-Standard-A', gender: 'F', provider: 'google' },
    { name: 'es-ES-Wavenet-B', code: 'es-ES-Wavenet-B', gender: 'M', provider: 'google' },
  ],
  it: [
    { name: 'it-IT-Neural2-A', code: 'it-IT-Neural2-A', gender: 'F', provider: 'google' },
    { name: 'it-IT-Neural2-B', code: 'it-IT-Neural2-B', gender: 'M', provider: 'google' },
    { name: 'it-IT-Standard-A', code: 'it-IT-Standard-A', gender: 'F', provider: 'google' },
    { name: 'it-IT-Wavenet-A', code: 'it-IT-Wavenet-A', gender: 'F', provider: 'google' },
    { name: 'it-IT-Wavenet-B', code: 'it-IT-Wavenet-B', gender: 'F', provider: 'google' },
    { name: 'it-IT-Wavenet-C', code: 'it-IT-Wavenet-C', gender: 'M', provider: 'google' },
    { name: 'it-IT-Wavenet-D', code: 'it-IT-Wavenet-D', gender: 'M', provider: 'google' },
  ],
  pt: [
    { name: 'pt-PT-Standard-A', code: 'pt-PT-Standard-A', gender: 'F', provider: 'google' },
    { name: 'pt-PT-Standard-B', code: 'pt-PT-Standard-B', gender: 'M', provider: 'google' },
    { name: 'pt-PT-Wavenet-A', code: 'pt-PT-Wavenet-A', gender: 'F', provider: 'google' },
    { name: 'pt-PT-Wavenet-B', code: 'pt-PT-Wavenet-B', gender: 'M', provider: 'google' },
  ],
  sl: [
    { name: 'sl-SI-Standard-A', code: 'sl-SI-Standard-A', gender: 'F', provider: 'google' },
  ],
  hu: [
    { name: 'hu-HU-Standard-A', code: 'hu-HU-Standard-A', gender: 'F', provider: 'google' },
    { name: 'hu-HU-Wavenet-A', code: 'hu-HU-Wavenet-A', gender: 'F', provider: 'google' },
  ],
  uk: [
    { name: 'uk-UA-Standard-A', code: 'uk-UA-Standard-A', gender: 'F', provider: 'google' },
    { name: 'uk-UA-Wavenet-A', code: 'uk-UA-Wavenet-A', gender: 'F', provider: 'google' },
  ],
  ru: [
    { name: 'ru-RU-Standard-A', code: 'ru-RU-Standard-A', gender: 'F', provider: 'google' },
    { name: 'ru-RU-Standard-B', code: 'ru-RU-Standard-B', gender: 'M', provider: 'google' },
    { name: 'ru-RU-Wavenet-A', code: 'ru-RU-Wavenet-A', gender: 'F', provider: 'google' },
    { name: 'ru-RU-Wavenet-B', code: 'ru-RU-Wavenet-B', gender: 'M', provider: 'google' },
    { name: 'ru-RU-Wavenet-C', code: 'ru-RU-Wavenet-C', gender: 'F', provider: 'google' },
    { name: 'ru-RU-Wavenet-D', code: 'ru-RU-Wavenet-D', gender: 'M', provider: 'google' },
  ],
  sv: [
    { name: 'sv-SE-Standard-A', code: 'sv-SE-Standard-A', gender: 'F', provider: 'google' },
    { name: 'sv-SE-Standard-C', code: 'sv-SE-Standard-C', gender: 'F', provider: 'google' },
    { name: 'sv-SE-Standard-D', code: 'sv-SE-Standard-D', gender: 'M', provider: 'google' },
    { name: 'sv-SE-Wavenet-A', code: 'sv-SE-Wavenet-A', gender: 'F', provider: 'google' },
  ],
  et: [
    { name: 'et-EE-Standard-A', code: 'et-EE-Standard-A', gender: 'F', provider: 'google' },
  ],
  lt: [
    { name: 'lt-LT-Standard-A', code: 'lt-LT-Standard-A', gender: 'M', provider: 'google' },
  ],
  lv: [
    { name: 'lv-LV-Standard-A', code: 'lv-LV-Standard-A', gender: 'F', provider: 'google' },
  ],
  'zh-CN': [
    { name: 'cmn-CN-Standard-C', code: 'cmn-CN-Standard-C', gender: 'M', provider: 'google' },
    { name: 'cmn-CN-Standard-D', code: 'cmn-CN-Standard-D', gender: 'F', provider: 'google' },
    { name: 'cmn-CN-Wavenet-A', code: 'cmn-CN-Wavenet-A', gender: 'F', provider: 'google' },
    { name: 'cmn-CN-Wavenet-B', code: 'cmn-CN-Wavenet-B', gender: 'M', provider: 'google' },
  ],
  'zh-TW': [
    { name: 'cmn-CN-Standard-C', code: 'cmn-CN-Standard-C', gender: 'M', provider: 'google' },
    { name: 'cmn-CN-Standard-D', code: 'cmn-CN-Standard-D', gender: 'F', provider: 'google' },
  ],
};

export const SAMPLE_TEXTS: Record<string, string> = {
  cs: 'Bylo nebylo, v daleké zemi žil jeden král, který měl tři syny.',
  sk: 'Bolo raz, v ďalekej krajine žil jeden kráľ, ktorý mal troch synov.',
  en: 'Once upon a time, in a faraway land, there lived a king who had three sons.',
  pl: 'Dawno, dawno temu, w odległej krainie, żył sobie król, który miał trzech synów.',
  de: 'Es war einmal, in einem fernen Land, lebte ein König, der drei Söhne hatte.',
  fr: 'Il était une fois, dans un pays lointain, un roi qui avait trois fils.',
  es: 'Érase una vez, en una tierra lejana, vivía un rey que tenía tres hijos.',
  it: 'C\'era una volta, in una terra lontana, un re che aveva tre figli.',
  pt: 'Era uma vez, numa terra distante, vivia um rei que tinha três filhos.',
  sl: 'Nekoč, v daljni deželi, je živel kralj, ki je imel tri sinove.',
  hu: 'Egyszer volt, hol nem volt, egy távoli országban élt egy király, akinek három fia volt.',
  uk: 'Жив колись у далекій країні один король, і було в нього три сини.',
  ru: 'Жил-был в далёкой стране один король, и было у него три сына.',
  sv: 'Det var en gång, i ett fjärran land, en kung som hade tre söner.',
  et: 'Elas kord kauges maal kuningas, kellel oli kolm poega.',
  lt: 'Seniai seniai, tolimame krašte, gyveno karalius, kuris turėjo tris sūnus.',
  lv: 'Reiz tālā zemē dzīvoja karalis, kuram bija trīs dēli.',
  'zh-CN': '从前，在一个遥远的国度，住着一位国王，他有三个儿子。',
};

export const ELEVENLABS_VOICES: TtsVoiceOption[] = [
  { name: 'Bíba',      code: 'dIzPtf5UROMD6ykqGQTS', gender: 'F', provider: 'elevenlabs' },
  { name: 'Honza',     code: 'bXwRnJxNkyIuXGcXZU4N', gender: 'M', provider: 'elevenlabs' },
  { name: 'Rachel',    code: '21m00Tcm4TlvDq8ikWAM', gender: 'F', provider: 'elevenlabs' },
  { name: 'Drew',      code: '29vD33N1CtxCmqQRPOHJ', gender: 'M', provider: 'elevenlabs' },
  { name: 'Clyde',     code: '2EiwWnXFnvU5JabPnv8n', gender: 'M', provider: 'elevenlabs' },
  { name: 'Paul',      code: '5Q0t7uMcjvnagumLfvZi', gender: 'M', provider: 'elevenlabs' },
  { name: 'Domi',      code: 'AZnzlk1XvdvUeBnXmlld', gender: 'F', provider: 'elevenlabs' },
  { name: 'Dave',      code: 'CYw3kZ02Hs0563khs1Fj', gender: 'M', provider: 'elevenlabs' },
  { name: 'Fin',       code: 'D38z5RcWu1voky8WS1ja', gender: 'M', provider: 'elevenlabs' },
  { name: 'Sarah',     code: 'EXAVITQu4vr4xnSDxMaL', gender: 'F', provider: 'elevenlabs' },
  { name: 'Antoni',    code: 'ErXwobaYiN019PkySvjV', gender: 'M', provider: 'elevenlabs' },
  { name: 'Thomas',    code: 'GBv7mTt0atIp3Br8iCZE', gender: 'M', provider: 'elevenlabs' },
  { name: 'Charlie',   code: 'IKne3meq5aSn9XLyUdCD', gender: 'M', provider: 'elevenlabs' },
  { name: 'George',    code: 'JBFqnCBsd6RMkjVDRZzb', gender: 'M', provider: 'elevenlabs' },
  { name: 'Emily',     code: 'LcfcDJNUP1GQjkzn1xUU', gender: 'F', provider: 'elevenlabs' },
  { name: 'Elli',      code: 'MF3mGyEYCl7XYWbV9V6O', gender: 'F', provider: 'elevenlabs' },
  { name: 'Callum',    code: 'N2lVS1w4EtoT3dr4eOWO', gender: 'M', provider: 'elevenlabs' },
  { name: 'Patrick',   code: 'ODq5zmih8GrVes37Dizd', gender: 'M', provider: 'elevenlabs' },
  { name: 'Harry',     code: 'SOYHLrjzK2X1ezoPC6cr', gender: 'M', provider: 'elevenlabs' },
  { name: 'Liam',      code: 'TX3LPaxmHKxFdv7VOQHJ', gender: 'M', provider: 'elevenlabs' },
  { name: 'Dorothy',   code: 'ThT5KcBeYPX3keUQqHPh', gender: 'F', provider: 'elevenlabs' },
  { name: 'Josh',      code: 'TxGEqnHWrfWFTfGW9XjX', gender: 'M', provider: 'elevenlabs' },
  { name: 'Arnold',    code: 'VR6AewLTigWG4xSOukaG', gender: 'M', provider: 'elevenlabs' },
  { name: 'Charlotte', code: 'XB0fDUnXU5powFXDhCwa', gender: 'F', provider: 'elevenlabs' },
  { name: 'Alice',     code: 'Xb7hH8MSUJpSbSDYk0k2', gender: 'F', provider: 'elevenlabs' },
  { name: 'Matilda',   code: 'XrExE9yKIg1WjnnlVkGX', gender: 'F', provider: 'elevenlabs' },
  { name: 'James',     code: 'ZQe5CZNOzWyzPSCn5a3c', gender: 'M', provider: 'elevenlabs' },
  { name: 'Joseph',    code: 'Zlb1dXrM653N07WRdFW3', gender: 'M', provider: 'elevenlabs' },
  { name: 'Jeremy',    code: 'bVMeCyTHy58xNoL34h3p', gender: 'M', provider: 'elevenlabs' },
  { name: 'Michael',   code: 'flq6f7yk4E4fJM5XTYuZ', gender: 'M', provider: 'elevenlabs' },
  { name: 'Ethan',     code: 'g5CIjZEefAph4nQFvHAz', gender: 'M', provider: 'elevenlabs' },
  { name: 'Chris',     code: 'iP95p4xoKVk53GoZ742B', gender: 'M', provider: 'elevenlabs' },
  { name: 'Gigi',      code: 'jBpfuIE2acCO8z3wKNLl', gender: 'F', provider: 'elevenlabs' },
  { name: 'Freya',     code: 'jsCqWAovK2LkecY7zXl4', gender: 'F', provider: 'elevenlabs' },
  { name: 'Brian',     code: 'nPczCjzI2devNBz1zQrb', gender: 'M', provider: 'elevenlabs' },
  { name: 'Grace',     code: 'oWAxZDx7w5VEj9dCyTzz', gender: 'F', provider: 'elevenlabs' },
  { name: 'Daniel',    code: 'onwK4e9ZLuTAKqWW03F9', gender: 'M', provider: 'elevenlabs' },
  { name: 'Lily',      code: 'pFZP5JQG7iQjIQuC4Bku', gender: 'F', provider: 'elevenlabs' },
  { name: 'Serena',    code: 'pMsXgVXv3BLzUgSXRplE', gender: 'F', provider: 'elevenlabs' },
  { name: 'Adam',      code: 'pNInz6obpgDQGcFmaJgB', gender: 'M', provider: 'elevenlabs' },
  { name: 'Nicole',    code: 'piTKgcLEGmPE4e6mEKli', gender: 'F', provider: 'elevenlabs' },
  { name: 'Bill',      code: 'pqHfZKP75CvOlQylNhV4', gender: 'M', provider: 'elevenlabs' },
  { name: 'Jessie',    code: 't0jbNlBVZ17f02VDIeMI', gender: 'M', provider: 'elevenlabs' },
  { name: 'Sam',       code: 'yoZ06aMxZJJ28mfd3POQ', gender: 'M', provider: 'elevenlabs' },
  { name: 'Glinda',    code: 'z9fAnlkpzviPz146aGWa', gender: 'F', provider: 'elevenlabs' },
  { name: 'Giovanni',  code: 'zcAOhNBS3c14rBihAFp1', gender: 'M', provider: 'elevenlabs' },
  { name: 'Mimi',      code: 'zrHiDhphv9ZnVXBqCLjz', gender: 'F', provider: 'elevenlabs' },
];

export function getVoiceGroups(langCode: string): VoiceGroup[] {
  const groups: VoiceGroup[] = [
    { provider: 'OpenAI', voices: OPENAI_VOICES },
    { provider: 'ElevenLabs', voices: ELEVENLABS_VOICES },
  ];
  const googleVoices = GOOGLE_VOICES[langCode];
  if (googleVoices?.length) {
    groups.push({ provider: 'Google', voices: googleVoices });
  }
  return groups;
}

export function getAllVoices(langCode: string): TtsVoiceOption[] {
  return [...OPENAI_VOICES, ...ELEVENLABS_VOICES, ...(GOOGLE_VOICES[langCode] || [])];
}

export function getVoiceLabel(voiceCode: string, langCode: string): string {
  if (!voiceCode) return '—';
  const voice = getAllVoices(langCode).find(v => v.code === voiceCode);
  return voice ? (voice.gender ? `${voice.name} (${voice.gender})` : voice.name) : voiceCode;
}
