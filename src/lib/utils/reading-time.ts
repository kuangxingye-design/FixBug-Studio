/**
 * Calculate estimated reading time for a given text.
 *
 * @param text - The markdown content to calculate reading time for
 * @param wordsPerMinute - Reading speed (default: 200 for English, 300 for Chinese)
 * @returns Reading time in minutes (minimum 1)
 */
export function calculateReadingTime(
  text: string,
  wordsPerMinute = 200
): number {
  // Count English words (space-separated)
  const englishWords = text
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter(Boolean).length;

  // Count Chinese characters
  const chineseChars = (text.match(/[一-鿿]/g) || []).length;

  // Chinese characters read at ~300 chars/min, English at ~200 words/min
  const englishMinutes = englishWords / wordsPerMinute;
  const chineseMinutes = chineseChars / 300;

  const totalMinutes = Math.ceil(englishMinutes + chineseMinutes);
  return Math.max(1, totalMinutes);
}
