import crypto from 'node:crypto';

export function buildDedupeKey(item) {
  const source = normalizePart(item.source || 'unknown');

  if (item.source_id) {
    return `${source}:source_id:${normalizePart(item.source_id)}`;
  }

  if (item.url) {
    return `${source}:url:${normalizeUrl(item.url)}`;
  }

  const date = normalizeDate(item.created_at || item.captured_at || '');
  const author = normalizePart(item.author_handle || item.author || 'unknown');
  const title = normalizePart(item.title || item.text || 'untitled');
  const hash = crypto
    .createHash('sha256')
    .update(`${title}|${author}|${date}`)
    .digest('hex')
    .slice(0, 24);

  return `${source}:hash:${hash}`;
}

// Tracking/analytics query params that never change what a URL points to, so
// two links that differ only by these are the same content.
const TRACKING_PARAMS = new Set(['s', 't', 'ref', 'ref_src', 'ref_url', 'cxt', 'cn', 'fbclid', 'gclid', 'igshid', 'mkt_tok']);

export function normalizeUrl(value) {
  try {
    const url = new URL(value);
    url.hash = '';
    let host = url.hostname.toLowerCase().replace(/^www\./, '');
    // Fold the Twitter/X host aliases so the same tweet from x.com, twitter.com,
    // or mobile.twitter.com dedupes to one item.
    if (host === 'twitter.com' || host === 'mobile.twitter.com') {
      host = 'x.com';
    }
    url.hostname = host;
    for (const key of [...url.searchParams.keys()]) {
      if (key.toLowerCase().startsWith('utm_') || TRACKING_PARAMS.has(key.toLowerCase())) {
        url.searchParams.delete(key);
      }
    }
    const normalized = url.toString().replace(/\/$/, '');
    return normalized;
  } catch {
    return normalizePart(value);
  }
}

export function normalizePart(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/^@/, '')
    .replace(/\s+/g, ' ')
    .replace(/[^\w:./?&=%+-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function normalizeDate(value) {
  if (!value) {
    return 'unknown-date';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return normalizePart(value);
  }
  return date.toISOString().slice(0, 10);
}
