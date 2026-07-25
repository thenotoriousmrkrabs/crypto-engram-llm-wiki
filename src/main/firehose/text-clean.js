// Display-layer text hygiene for the firehose (issue #3 follow-up). opennews
// `text` arrives with HTML tags/entities and in any language; the cold store
// keeps it verbatim as evidence, but the Discord *reading surface* wants clean,
// single-line, readable-language messages. Pure + dependency-free so the suite
// covers it without network or Discord.

const NAMED_ENTITIES = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' '
};

function decodeEntities(input) {
  return String(input).replace(/&(#x?[0-9a-f]+|[a-z][a-z0-9]*);/gi, (match, entity) => {
    if (entity[0] === '#') {
      const code = entity[1].toLowerCase() === 'x'
        ? parseInt(entity.slice(2), 16)
        : parseInt(entity.slice(1), 10);
      if (!Number.isFinite(code) || code <= 0) {
        return match;
      }
      try {
        return String.fromCodePoint(code);
      } catch {
        return match;
      }
    }
    const key = entity.toLowerCase();
    return Object.prototype.hasOwnProperty.call(NAMED_ENTITIES, key) ? NAMED_ENTITIES[key] : match;
  });
}

// Strip HTML, decode entities, collapse to a single clean line. Idempotent.
export function cleanText(input) {
  let text = String(input ?? '');
  // Line-breaking tags become spaces so words don't get glued together.
  text = text.replace(/<\s*br\s*\/?\s*>/gi, ' ');
  text = text.replace(/<\s*\/\s*(p|div|li|h[1-6]|tr|section)\s*>/gi, ' ');
  // Everything else tag-shaped is removed.
  text = text.replace(/<[^>]*>/g, '');
  text = decodeEntities(text);
  text = text.replace(/\s+/g, ' ').trim();
  return text;
}

// Coarse script detection: Latin -> en, CJK ideographs -> zh, and the common
// scripts the user can't read (Arabic/Persian, Cyrillic, Hebrew, Thai,
// Devanagari, Hangul, Greek) -> other. A stray foreign word inside an English
// post still reads as en because we only reject when the other-script letters
// are the majority.
export function detectLang(text) {
  const source = String(text || '');
  const latin = (source.match(/[A-Za-z]/g) || []).length;
  const cjk = (source.match(/[㐀-鿿豈-﫿]/g) || []).length;
  const other = (source.match(
    /[Ͱ-ϿЀ-ԯ֐-׿؀-ۿ܀-ݿࢠ-ࣿऀ-ॿ฀-๿가-힯]/g
  ) || []).length;

  if (other > 0 && latin + cjk < other) {
    return 'other';
  }
  return cjk > latin ? 'zh' : 'en';
}

// Keep an item if its language is in the allow-set. `all` in the set disables
// filtering entirely. Language is judged on the fuller text, falling back to
// the title.
export function keepByLang(item, langSet) {
  if (!langSet || langSet.size === 0 || langSet.has('all')) {
    return true;
  }
  return langSet.has(detectLang(item?.text || item?.title || ''));
}
