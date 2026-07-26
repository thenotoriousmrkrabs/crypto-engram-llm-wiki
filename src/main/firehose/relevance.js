import { normalizeUrl, normalizePart } from '../utils/dedupe.js';

// Firehose relevance + dedup (Lever 1: cross-source content dedup).
//
// The cold store dedups by OpenNews article id (source_id), so the SAME tweet
// surfaced from x.com and twitter.com — two article ids — is stored twice, and
// reposts of one story pile up. contentKey collapses those: it identifies an
// item by its CONTENT, host-agnostic, so 3 copies of one Solana tweet become 1.

// A stable, host-agnostic key for one item or card. Priority:
//   1. a tweet/status id  -> `tweet:<id>`   (x.com == twitter.com == mobile)
//   2. any other url       -> `url:<normalized>` (tracking params stripped)
//   3. title (+author)     -> `title:<author>:<title>` for url-less items
export function contentKey(itemOrCard) {
  const url = String(itemOrCard.url || itemOrCard.source_url || '').trim();
  const status = url.match(/(?:twitter\.com|x\.com|nitter\.[^/]+)\/[^/]+\/status(?:es)?\/(\d+)/i)
    || url.match(/\/status(?:es)?\/(\d+)/);
  if (status) {
    return `tweet:${status[1]}`;
  }
  if (url) {
    return `url:${normalizeUrl(url)}`;
  }
  const title = normalizePart(itemOrCard.title || itemOrCard.text || '');
  const author = normalizePart(itemOrCard.author_handle || itemOrCard.author || '');
  if (title) {
    return `title:${author}:${title.slice(0, 120)}`;
  }
  // Nothing to fold on — fall back to the item's own id so it is never merged
  // with an unrelated item.
  return `id:${itemOrCard.source || ''}:${itemOrCard.source_id || itemOrCard.id || ''}`;
}

// Higher AI score wins; tie-break to the newer item. Used to pick which copy of
// a duplicate survives (keep the best-rated, most-recent representative).
function scoreOf(card) {
  const s = card.score ?? card.raw?.aiRating?.score;
  return typeof s === 'number' ? s : -1;
}
function tsOf(card) {
  return typeof card.tsMs === 'number' ? card.tsMs : 0;
}
function isBetter(a, b) {
  const sa = scoreOf(a), sb = scoreOf(b);
  if (sa !== sb) {
    return sa > sb;
  }
  return tsOf(a) >= tsOf(b);
}

// Collapse items/cards that share a contentKey, keeping the best representative.
// Order-preserving on first appearance so a caller that pre-sorted stays stable.
export function dedupeByContent(items, { key = contentKey } = {}) {
  const bestByKey = new Map();
  const order = [];
  for (const item of items) {
    const k = key(item);
    if (!bestByKey.has(k)) {
      order.push(k);
      bestByKey.set(k, item);
    } else if (isBetter(item, bestByKey.get(k))) {
      bestByKey.set(k, item);
    }
  }
  return order.map((k) => bestByKey.get(k));
}
