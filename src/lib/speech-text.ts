/**
 * Speech text preparation.
 *
 * TTS engines read raw chat text literally — markdown, emoji, code fences and
 * long run-on paragraphs are the main reason a voice sounds robotic. This module
 * turns a written reply into something a small talking cat would actually say:
 * clean words, natural punctuation, and short breath-sized chunks.
 */

const ARABIC = /[\u0600-\u06FF]/;

/** Does this text contain Arabic script? */
export function hasArabic(text: string) {
  return ARABIC.test(text);
}

/** Mostly-Arabic text (so we can pick the Egyptian-Arabic voice direction). */
export function isMostlyArabic(text: string) {
  const arabic = (text.match(/[\u0600-\u06FF]/g) ?? []).length;
  const latin = (text.match(/[A-Za-z]/g) ?? []).length;
  return arabic > 0 && arabic >= latin;
}

/** Collapse repeated cat noises so she never chants "مياو مياو مياو". */
function dedupeCatNoise(text: string) {
  return text
    .replace(/(\bmeow\b[\s,!.]*){2,}/gi, "meow. ")
    .replace(/((?:مياو|ميااو|مياااو)[\s،,!.]*){2,}/g, "مياو. ");
}

/**
 * Rewrite a written reply into speakable prose.
 * Keeps meaning, drops anything that would be read out as symbols.
 */
export function toSpeakable(text: string): string {
  let out = text;

  // Code is described, not spelled out.
  out = out.replace(/```[\s\S]*?```/g, " (code block) ");
  out = out.replace(/`([^`]+)`/g, "$1");

  // Markdown decoration.
  out = out.replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1");
  out = out.replace(/[*_#>|]+/g, " ");
  out = out.replace(/^\s*[-•]\s*/gm, " ");

  // Emoji / pictographs and stray symbols.
  out = out.replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu, " ");

  // Ellipses become a real hesitation, not three dots read aloud.
  out = out.replace(/\.{3,}/g, "… ");
  out = out.replace(/\u2026/g, "… ");

  // Line breaks become sentence pauses so paragraphs don't run together.
  out = out.replace(/\r/g, "").replace(/\n{2,}/g, ". ").replace(/\n/g, ", ");

  out = dedupeCatNoise(out);

  // Whitespace and punctuation clean-up.
  out = out.replace(/\s{2,}/g, " ");
  out = out.replace(/\s+([,.!?،؟])/g, "$1");
  out = out.replace(/([,.!?،؟]){2,}/g, "$1");

  return out.trim();
}

/**
 * Split speakable text into breath-sized chunks at sentence boundaries.
 * Short chunks start playing sooner and let the model shape each sentence with
 * its own rhythm instead of flattening everything into one monotone block.
 */
export function chunkForSpeech(text: string, maxChars = 240): string[] {
  const sentences = text.match(/[^.!?،؟\u06D4]+[.!?،؟\u06D4]*\s*/g) ?? [text];
  const chunks: string[] = [];
  let current = "";

  const flush = () => {
    if (current.trim()) chunks.push(current.trim());
    current = "";
  };

  for (const sentence of sentences) {
    if (sentence.length > maxChars) {
      flush();
      const words = sentence.split(/\s+/);
      let piece = "";
      for (const word of words) {
        if ((piece + " " + word).trim().length > maxChars) {
          if (piece.trim()) chunks.push(piece.trim());
          piece = word;
        } else {
          piece = `${piece} ${word}`.trim();
        }
      }
      if (piece.trim()) chunks.push(piece.trim());
      continue;
    }
    if (current && current.length + sentence.length > maxChars) flush();
    current += sentence;
  }
  flush();

  return chunks.filter(Boolean);
}
