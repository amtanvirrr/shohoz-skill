/**
 * Sanitize + smart-truncate the `orders.notes` failure reason coming from
 * SSLCommerz's redirect payload. The raw value can contain HTML, control
 * characters, gateway debug noise, repeated whitespace, or be excessively
 * long. We want a clean, readable Bengali/English line for the UI.
 */
export interface SanitizedNote {
  /** Cleaned text safe to render. */
  text: string;
  /** Full cleaned text (no truncation) — for "show more" expansion. */
  full: string;
  /** True if `text` was shortened from `full`. */
  truncated: boolean;
}

const DEFAULT_MAX = 220;

// Phrases the gateway often appends that add noise without information.
const NOISE_PATTERNS: RegExp[] = [
  /\bSession\s*(?:ID|Id)\s*[:=]\s*\S+/gi,
  /\bTran(?:saction)?\s*(?:ID|Id)\s*[:=]\s*\S+/gi,
  /\bval[_-]?id\s*[:=]\s*\S+/gi,
  /\bbank[_-]?tran[_-]?id\s*[:=]\s*\S+/gi,
  /\bstore[_-]?id\s*[:=]\s*\S+/gi,
  /https?:\/\/\S+/gi,
];

export function sanitizeFailureNote(
  raw: string | null | undefined,
  maxLength: number = DEFAULT_MAX,
): SanitizedNote {
  if (!raw) return { text: "", full: "", truncated: false };

  let s = String(raw);

  // Strip HTML tags entirely — we render this as plain text, no markup.
  s = s.replace(/<[^>]*>/g, " ");

  // Decode the handful of HTML entities the gateway tends to emit.
  s = s
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&nbsp;/gi, " ");

  // Remove control chars + zero-width junk, but preserve Bengali (U+0980+).
  // eslint-disable-next-line no-control-regex
  s = s.replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200F\uFEFF]/g, " ");

  // Drop noisy gateway tokens (session/tran ids, raw URLs).
  for (const re of NOISE_PATTERNS) s = s.replace(re, " ");

  // Keep letters/digits/Bengali/common punctuation; drop everything else.
  // Allowed: word chars, whitespace, Bengali block, and . , ! ? : ; - ( ) ' " ৳ % /
  s = s.replace(/[^\p{L}\p{N}\s.,!?:;\-()'"৳%/]/gu, " ");

  // Collapse runs of whitespace and trim.
  s = s.replace(/\s+/g, " ").trim();

  // Strip dangling separators left after token removal (e.g. " , , ").
  s = s.replace(/(?:\s*[,;:\-]\s*){2,}/g, ", ").replace(/^[\s,;:\-]+|[\s,;:\-]+$/g, "");

  const full = s;
  if (full.length <= maxLength) {
    return { text: full, full, truncated: false };
  }

  // Smart truncation: prefer the last sentence/word boundary before maxLength.
  const slice = full.slice(0, maxLength);
  const sentenceEnd = Math.max(
    slice.lastIndexOf("। "),
    slice.lastIndexOf(". "),
    slice.lastIndexOf("! "),
    slice.lastIndexOf("? "),
  );
  let cut = sentenceEnd > maxLength * 0.6 ? sentenceEnd + 1 : -1;
  if (cut < 0) {
    const wordEnd = slice.lastIndexOf(" ");
    cut = wordEnd > maxLength * 0.5 ? wordEnd : maxLength;
  }
  const text = full.slice(0, cut).replace(/[\s.,;:\-]+$/, "") + "…";
  return { text, full, truncated: true };
}