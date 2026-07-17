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

export function normalizeUrl(value) {
  try {
    const url = new URL(value);
    url.hash = '';
    url.hostname = url.hostname.toLowerCase();
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
