export function removeInterpunction(text: string) {
  return text.replace(/[.,;:!?"""''`()[\]{}]/g, '');
}
