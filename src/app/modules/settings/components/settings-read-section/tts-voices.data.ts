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
    { name: 'Wavenet A', code: 'cs-CZ-Wavenet-A', gender: 'F', provider: 'google' },
    { name: 'Standard A', code: 'cs-CZ-Standard-A', gender: 'F', provider: 'google' },
  ],
  sk: [
    { name: 'Wavenet A', code: 'sk-SK-Wavenet-A', gender: 'F', provider: 'google' },
    { name: 'Standard A', code: 'sk-SK-Standard-A', gender: 'F', provider: 'google' },
  ],
  en: [
    { name: 'Wavenet A', code: 'en-US-Wavenet-A', gender: 'M', provider: 'google' },
    { name: 'Wavenet B', code: 'en-US-Wavenet-B', gender: 'M', provider: 'google' },
    { name: 'Wavenet C', code: 'en-US-Wavenet-C', gender: 'F', provider: 'google' },
    { name: 'Wavenet D', code: 'en-US-Wavenet-D', gender: 'M', provider: 'google' },
    { name: 'Wavenet E', code: 'en-US-Wavenet-E', gender: 'F', provider: 'google' },
    { name: 'Wavenet F', code: 'en-US-Wavenet-F', gender: 'F', provider: 'google' },
    { name: 'Neural2 A', code: 'en-US-Neural2-A', gender: 'M', provider: 'google' },
    { name: 'Neural2 C', code: 'en-US-Neural2-C', gender: 'F', provider: 'google' },
    { name: 'Neural2 D', code: 'en-US-Neural2-D', gender: 'M', provider: 'google' },
    { name: 'Neural2 E', code: 'en-US-Neural2-E', gender: 'F', provider: 'google' },
    { name: 'Neural2 F', code: 'en-US-Neural2-F', gender: 'F', provider: 'google' },
    { name: 'Studio O', code: 'en-US-Studio-O', gender: 'F', provider: 'google' },
    { name: 'Studio Q', code: 'en-US-Studio-Q', gender: 'M', provider: 'google' },
    { name: 'Standard A', code: 'en-US-Standard-A', gender: 'M', provider: 'google' },
    { name: 'Standard C', code: 'en-US-Standard-C', gender: 'F', provider: 'google' },
    { name: 'GB Wavenet A', code: 'en-GB-Wavenet-A', gender: 'F', provider: 'google' },
    { name: 'GB Wavenet B', code: 'en-GB-Wavenet-B', gender: 'M', provider: 'google' },
    { name: 'GB Neural2 A', code: 'en-GB-Neural2-A', gender: 'F', provider: 'google' },
    { name: 'GB Neural2 B', code: 'en-GB-Neural2-B', gender: 'M', provider: 'google' },
  ],
  pl: [
    { name: 'Wavenet A', code: 'pl-PL-Wavenet-A', gender: 'F', provider: 'google' },
    { name: 'Wavenet B', code: 'pl-PL-Wavenet-B', gender: 'M', provider: 'google' },
    { name: 'Wavenet C', code: 'pl-PL-Wavenet-C', gender: 'M', provider: 'google' },
    { name: 'Wavenet D', code: 'pl-PL-Wavenet-D', gender: 'F', provider: 'google' },
    { name: 'Standard A', code: 'pl-PL-Standard-A', gender: 'F', provider: 'google' },
    { name: 'Standard B', code: 'pl-PL-Standard-B', gender: 'M', provider: 'google' },
  ],
  de: [
    { name: 'Wavenet A', code: 'de-DE-Wavenet-A', gender: 'F', provider: 'google' },
    { name: 'Wavenet B', code: 'de-DE-Wavenet-B', gender: 'M', provider: 'google' },
    { name: 'Wavenet C', code: 'de-DE-Wavenet-C', gender: 'F', provider: 'google' },
    { name: 'Wavenet D', code: 'de-DE-Wavenet-D', gender: 'M', provider: 'google' },
    { name: 'Neural2 A', code: 'de-DE-Neural2-A', gender: 'F', provider: 'google' },
    { name: 'Neural2 B', code: 'de-DE-Neural2-B', gender: 'M', provider: 'google' },
    { name: 'Standard A', code: 'de-DE-Standard-A', gender: 'F', provider: 'google' },
    { name: 'Standard B', code: 'de-DE-Standard-B', gender: 'M', provider: 'google' },
  ],
  fr: [
    { name: 'Wavenet A', code: 'fr-FR-Wavenet-A', gender: 'F', provider: 'google' },
    { name: 'Wavenet B', code: 'fr-FR-Wavenet-B', gender: 'M', provider: 'google' },
    { name: 'Wavenet C', code: 'fr-FR-Wavenet-C', gender: 'F', provider: 'google' },
    { name: 'Wavenet D', code: 'fr-FR-Wavenet-D', gender: 'M', provider: 'google' },
    { name: 'Neural2 A', code: 'fr-FR-Neural2-A', gender: 'F', provider: 'google' },
    { name: 'Neural2 B', code: 'fr-FR-Neural2-B', gender: 'M', provider: 'google' },
    { name: 'Standard A', code: 'fr-FR-Standard-A', gender: 'F', provider: 'google' },
    { name: 'Standard B', code: 'fr-FR-Standard-B', gender: 'M', provider: 'google' },
  ],
  es: [
    { name: 'Wavenet B', code: 'es-ES-Wavenet-B', gender: 'M', provider: 'google' },
    { name: 'Neural2 A', code: 'es-ES-Neural2-A', gender: 'F', provider: 'google' },
    { name: 'Standard A', code: 'es-ES-Standard-A', gender: 'F', provider: 'google' },
  ],
  it: [
    { name: 'Wavenet A', code: 'it-IT-Wavenet-A', gender: 'F', provider: 'google' },
    { name: 'Wavenet B', code: 'it-IT-Wavenet-B', gender: 'F', provider: 'google' },
    { name: 'Wavenet C', code: 'it-IT-Wavenet-C', gender: 'M', provider: 'google' },
    { name: 'Wavenet D', code: 'it-IT-Wavenet-D', gender: 'M', provider: 'google' },
    { name: 'Standard A', code: 'it-IT-Standard-A', gender: 'F', provider: 'google' },
  ],
  pt: [
    { name: 'Wavenet A', code: 'pt-PT-Wavenet-A', gender: 'F', provider: 'google' },
    { name: 'Wavenet B', code: 'pt-PT-Wavenet-B', gender: 'M', provider: 'google' },
    { name: 'Standard A', code: 'pt-PT-Standard-A', gender: 'F', provider: 'google' },
  ],
  sl: [
    { name: 'Standard A', code: 'sl-SI-Standard-A', gender: 'F', provider: 'google' },
  ],
  hu: [
    { name: 'Wavenet A', code: 'hu-HU-Wavenet-A', gender: 'F', provider: 'google' },
    { name: 'Standard A', code: 'hu-HU-Standard-A', gender: 'F', provider: 'google' },
  ],
  uk: [
    { name: 'Wavenet A', code: 'uk-UA-Wavenet-A', gender: 'F', provider: 'google' },
    { name: 'Standard A', code: 'uk-UA-Standard-A', gender: 'F', provider: 'google' },
  ],
  ru: [
    { name: 'Wavenet A', code: 'ru-RU-Wavenet-A', gender: 'F', provider: 'google' },
    { name: 'Wavenet B', code: 'ru-RU-Wavenet-B', gender: 'M', provider: 'google' },
    { name: 'Wavenet C', code: 'ru-RU-Wavenet-C', gender: 'F', provider: 'google' },
    { name: 'Wavenet D', code: 'ru-RU-Wavenet-D', gender: 'M', provider: 'google' },
    { name: 'Standard A', code: 'ru-RU-Standard-A', gender: 'F', provider: 'google' },
  ],
  sv: [
    { name: 'Wavenet A', code: 'sv-SE-Wavenet-A', gender: 'F', provider: 'google' },
    { name: 'Standard A', code: 'sv-SE-Standard-A', gender: 'F', provider: 'google' },
  ],
  et: [
    { name: 'Standard A', code: 'et-EE-Standard-A', gender: 'F', provider: 'google' },
  ],
  lt: [
    { name: 'Standard A', code: 'lt-LT-Standard-A', gender: 'M', provider: 'google' },
  ],
  lv: [
    { name: 'Standard A', code: 'lv-LV-Standard-A', gender: 'F', provider: 'google' },
  ],
  'zh-CN': [
    { name: 'Wavenet A', code: 'cmn-CN-Wavenet-A', gender: 'F', provider: 'google' },
    { name: 'Wavenet B', code: 'cmn-CN-Wavenet-B', gender: 'M', provider: 'google' },
    { name: 'Standard A', code: 'cmn-CN-Standard-A', gender: 'F', provider: 'google' },
    { name: 'Standard B', code: 'cmn-CN-Standard-B', gender: 'M', provider: 'google' },
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

export function getVoiceGroups(langCode: string): VoiceGroup[] {
  const groups: VoiceGroup[] = [{ provider: 'OpenAI', voices: OPENAI_VOICES }];
  const googleVoices = GOOGLE_VOICES[langCode];
  if (googleVoices?.length) {
    groups.push({ provider: 'Google', voices: googleVoices });
  }
  return groups;
}

export function getAllVoices(langCode: string): TtsVoiceOption[] {
  return [...OPENAI_VOICES, ...(GOOGLE_VOICES[langCode] || [])];
}

export function getVoiceLabel(voiceCode: string, langCode: string): string {
  if (!voiceCode) return '—';
  const voice = getAllVoices(langCode).find(v => v.code === voiceCode);
  return voice ? (voice.gender ? `${voice.name} (${voice.gender})` : voice.name) : voiceCode;
}
