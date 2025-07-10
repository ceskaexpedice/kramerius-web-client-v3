export function copyTextToClipboard(text: string): void {
  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.style.position = 'fixed'; // Prevent scrolling to bottom of page in MS Edge.
  textArea.style.opacity = '0'; // Make it invisible.
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  try {
    document.execCommand('copy');
    console.log('Text copied to clipboard:', text);
  } catch (err) {
    console.error('Failed to copy text:', err);
  }

  document.body.removeChild(textArea);
}
