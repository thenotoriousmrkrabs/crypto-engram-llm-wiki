import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import { defaultColdStoreRoot } from './cold-store.js';
import { cleanText } from './text-clean.js';

// Deterministic retrieval over the firehose cold store (the Hermes digest
// foundation). No AI, no network: it filters the tagged cold-store items by
// coin / theme / recency / score / signal and returns lean, summary-ready
// cards, newest first. A summarize step (Hermes/LLM) sits ON TOP of this — the
// filtering itself must stay pure and testable so the same query is repeatable.
//
// Topic filter semantics: coins and themes UNION (an item matches if it touches
// any requested coin OR any requested theme — "HYPE or Polymarket news"). score
// / since / signal are AND constraints that always narrow.

export async function queryColdStore({
  root = defaultColdStoreRoot(),
  source = 'opennews',
  coins = [],
  themes = [],
  since,
  minScore = 0,
  signal,
  limit
} = {}) {
  const dir = path.join(root, source);
  if (!fsSync.existsSync(dir)) {
    return [];
  }

  const sinceMs = toMs(since);
  const wantCoins = new Set(coins.map((coin) => String(coin).toUpperCase()));
  const wantThemes = new Set(themes.map((theme) => String(theme).toLowerCase()));

  const files = (await fs.readdir(dir)).filter((file) => file.endsWith('.json'));
  const cards = [];
  for (const file of files) {
    let item;
    try {
      item = JSON.parse(await fs.readFile(path.join(dir, file), 'utf8'));
    } catch {
      continue; // a half-written or corrupt file must not sink the whole query
    }
    if (passes(item, { wantCoins, wantThemes, sinceMs, minScore, signal })) {
      cards.push(toCard(item));
    }
  }

  cards.sort((a, b) => b.tsMs - a.tsMs);
  return typeof limit === 'number' ? cards.slice(0, limit) : cards;
}

function passes(item, { wantCoins, wantThemes, sinceMs, minScore, signal }) {
  const rating = item.raw?.aiRating || {};
  if (Number(rating.score ?? 0) < minScore) {
    return false;
  }
  if (signal && rating.signal !== signal) {
    return false;
  }
  if (sinceMs !== undefined && itemMs(item) < sinceMs) {
    return false;
  }
  if (wantCoins.size > 0 || wantThemes.size > 0) {
    const coinHit = (item.watchlist_coins || []).some((coin) => wantCoins.has(String(coin).toUpperCase()));
    const themeHit = (item.matched_themes || []).some((theme) => wantThemes.has(String(theme).toLowerCase()));
    if (!coinHit && !themeHit) {
      return false;
    }
  }
  return true;
}

const HEADLINE_MAX = 200;

function headline(text) {
  const clean = cleanText(text || '');
  return clean.length > HEADLINE_MAX ? `${clean.slice(0, HEADLINE_MAX - 1)}…` : clean;
}

function toCard(item) {
  const rating = item.raw?.aiRating || {};
  return {
    id: item.source_id || '',
    source: item.source || '',
    title: headline(item.title || ''), // capped for reading; full text below
    url: item.url || '',
    coins: Array.isArray(item.watchlist_coins) ? item.watchlist_coins : [],
    themes: Array.isArray(item.matched_themes) ? item.matched_themes : [],
    score: rating.score ?? null,
    grade: rating.grade || '',
    signal: rating.signal || '',
    published: item.created_at || '',
    tsMs: itemMs(item),
    text: cleanText(item.text || '')
  };
}

function itemMs(item) {
  if (item.created_at) {
    const parsed = Date.parse(item.created_at);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  // Fall back to the raw opennews timestamp, which may be epoch ms or an ISO
  // string. Existing cold-store items predate the mapper fix and carry an empty
  // created_at, so this fallback is what makes them queryable by time.
  const ts = item.raw?.ts;
  if (typeof ts === 'number') {
    return ts;
  }
  if (typeof ts === 'string') {
    const parsed = Date.parse(ts);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  return 0;
}

// Accepts a Date, an epoch-ms number, or an ISO string. Human specs ("today",
// "24h") are resolved by parseSince first.
function toMs(since) {
  if (since === undefined || since === null) {
    return undefined;
  }
  if (since instanceof Date) {
    return since.getTime();
  }
  if (typeof since === 'number') {
    return since;
  }
  const parsed = Date.parse(since);
  return Number.isNaN(parsed) ? undefined : parsed;
}

// Human "since" specs -> epoch ms, for the CLI / Hermes:
//   "today"        -> local midnight today
//   "24h" / "7d"   -> now minus that span (units: m, h, d)
//   ISO string     -> that instant
export function parseSince(spec, now = new Date()) {
  const value = String(spec ?? '').trim().toLowerCase();
  if (value === '' ) {
    return undefined;
  }
  if (value === 'today') {
    const midnight = new Date(now);
    midnight.setHours(0, 0, 0, 0);
    return midnight.getTime();
  }
  const relative = value.match(/^(\d+)\s*([mhd])$/);
  if (relative) {
    const amount = Number(relative[1]);
    const unitMs = { m: 60000, h: 3600000, d: 86400000 }[relative[2]];
    return now.getTime() - amount * unitMs;
  }
  const parsed = Date.parse(spec);
  return Number.isNaN(parsed) ? undefined : parsed;
}

// Compact, low-token digest a human or Hermes can read/summarize.
export function formatDigest(cards, { heading } = {}) {
  const header = heading ? `${heading}\n` : '';
  if (cards.length === 0) {
    return `${header}No matching items.`;
  }
  const body = cards.map((card, index) => {
    const facets = [
      card.coins.join(' '),
      card.themes.map((theme) => `#${theme.replace(/\s+/g, '')}`).join(' ')
    ].filter(Boolean).join(' · ');
    const rating = card.score != null ? `AI ${card.score} ${card.grade} ${card.signal}`.trim() : '';
    const meta = [facets, rating].filter(Boolean).join(' · ');
    return `${index + 1}. ${card.title}\n   ${card.url}${meta ? `\n   ${meta}` : ''}`;
  }).join('\n\n');
  return `${header}${cards.length} item(s)\n\n${body}`;
}
