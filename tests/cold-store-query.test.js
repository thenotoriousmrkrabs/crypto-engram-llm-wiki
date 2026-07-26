import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { PROJECT_ROOT } from '../src/main/utils/paths.js';
import { storeItems } from '../src/main/firehose/cold-store.js';
import {
  queryColdStore,
  parseSince,
  formatDigest,
  formatGroupedDigest,
  orderCardsForSummary
} from '../src/main/firehose/cold-store-query.js';

async function seededStore(items) {
  const root = path.join(PROJECT_ROOT, '.tmp-tests', crypto.randomUUID(), 'firehose');
  await fs.mkdir(root, { recursive: true });
  await storeItems({ root, source: 'opennews', items });
  return root;
}

function item({ id, title = 'x', ts, score = 90, signal = 'long', coins = [], themes = [] }) {
  return {
    source: 'opennews',
    source_id: id,
    title,
    url: `https://example.com/${id}`,
    text: title,
    created_at: new Date(ts).toISOString(),
    watchlist_coins: coins,
    matched_themes: themes,
    raw: { ts, aiRating: { score, grade: 'A', signal } }
  };
}

const DAY = 86400000;
const T = Date.parse('2026-07-20T12:00:00.000Z');

test('queryColdStore filters by coin and returns newest first', async () => {
  const root = await seededStore([
    item({ id: 'a', title: 'HYPE older', ts: T - DAY, coins: ['HYPE'] }),
    item({ id: 'b', title: 'HYPE newer', ts: T, coins: ['HYPE'] }),
    item({ id: 'c', title: 'BTC only', ts: T, coins: ['BTC'] })
  ]);

  const cards = await queryColdStore({ root, coins: ['hype'] }); // case-insensitive
  assert.deepEqual(cards.map((c) => c.id), ['b', 'a']); // newest first, BTC excluded
  assert.equal(cards[0].title, 'HYPE newer');
});

test('queryColdStore unions coins and themes, ANDs score/since/signal', async () => {
  const root = await seededStore([
    item({ id: 'coin', ts: T, coins: ['HYPE'], score: 95 }),
    item({ id: 'theme', ts: T, themes: ['Polymarket'], score: 95 }),
    item({ id: 'neither', ts: T, coins: ['DOGE'], themes: ['DeFi'], score: 95 }),
    item({ id: 'lowscore', ts: T, themes: ['Polymarket'], score: 60 }),
    item({ id: 'old', ts: T - 5 * DAY, coins: ['HYPE'], score: 95 }),
    item({ id: 'shortsig', ts: T, coins: ['HYPE'], score: 95, signal: 'short' })
  ]);

  // Union: coin HYPE OR theme Polymarket. AND: score>=90, since 2 days, long.
  const cards = await queryColdStore({
    root,
    coins: ['HYPE'],
    themes: ['polymarket'],
    minScore: 90,
    since: T - 2 * DAY,
    signal: 'long'
  });
  assert.deepEqual(cards.map((c) => c.id).sort(), ['coin', 'theme']);
});

test('queryColdStore honors a result limit', async () => {
  const root = await seededStore([
    item({ id: 'a', ts: T }),
    item({ id: 'b', ts: T - 1 }),
    item({ id: 'c', ts: T - 2 })
  ]);
  const cards = await queryColdStore({ root, limit: 2 });
  assert.equal(cards.length, 2);
});

test('queryColdStore returns [] for a missing store', async () => {
  const cards = await queryColdStore({ root: path.join(PROJECT_ROOT, '.tmp-tests', crypto.randomUUID()) });
  assert.deepEqual(cards, []);
});

test('parseSince resolves today, relative spans, and ISO', () => {
  const now = new Date('2026-07-20T15:30:00.000Z');
  assert.equal(parseSince('today', now), new Date('2026-07-20T00:00:00.000').getTime());
  assert.equal(parseSince('24h', now), now.getTime() - DAY);
  assert.equal(parseSince('7d', now), now.getTime() - 7 * DAY);
  assert.equal(parseSince('30m', now), now.getTime() - 30 * 60000);
  assert.equal(parseSince('2026-07-01', now), Date.parse('2026-07-01'));
  assert.equal(parseSince('', now), undefined);
  assert.equal(parseSince('garbage', now), undefined);
});

test('formatDigest renders compact cards with facets and rating', async () => {
  const root = await seededStore([
    item({ id: 'a', title: 'Hyperliquid vaults', ts: T, coins: ['HYPE'], themes: ['Hyperliquid'] })
  ]);
  const cards = await queryColdStore({ root });
  const text = formatDigest(cards, { heading: '# Digest' });
  assert.match(text, /# Digest/);
  assert.match(text, /1\. Hyperliquid vaults/);
  assert.match(text, /https:\/\/example\.com\/a/);
  assert.match(text, /HYPE · #Hyperliquid · AI 90 A long/);

  assert.equal(formatDigest([], { heading: '# Digest' }), '# Digest\nNo matching items.');
});

function card({ id, title = id, coins = [], themes = [], score = 90 }) {
  return {
    id, source: 'opennews', title, url: `https://example.com/${id}`,
    coins, themes, score, grade: 'A', signal: 'long', published: '', tsMs: 0, text: title
  };
}

test('orderCardsForSummary buckets coins, then theme-only, then other', () => {
  const cards = [
    card({ id: 'both', coins: ['HYPE'], themes: ['DeFi'] }),
    card({ id: 'themeonly', themes: ['Polymarket'] }),
    card({ id: 'bare' }),
    card({ id: 'coinonly', coins: ['BTC'] })
  ];
  const { coins, themes, other, ordered } = orderCardsForSummary(cards);
  assert.deepEqual(coins.map((c) => c.id), ['both', 'coinonly']); // coin wins even if it also has a theme
  assert.deepEqual(themes.map((c) => c.id), ['themeonly']);
  assert.deepEqual(other.map((c) => c.id), ['bare']);
  assert.deepEqual(ordered.map((c) => c.id), ['both', 'coinonly', 'themeonly', 'bare']);
});

test('formatGroupedDigest sections the cards with one running number', () => {
  const text = formatGroupedDigest([
    card({ id: 'c1', title: 'HYPE moves', coins: ['HYPE'] }),
    card({ id: 't1', title: 'Poly news', themes: ['Polymarket'] }),
    card({ id: 'o1', title: 'Loose end' })
  ], { heading: '# Firehose' });

  assert.match(text, /# Firehose\n3 item\(s\)/);
  assert.match(text, /📈 Watchlist Coins \(1\)/);
  assert.match(text, /🎯 Themes \(1\)/);
  assert.match(text, /🗞️ Other \(1\)/);
  // Numbering runs continuously across sections: coin=1, theme=2, other=3.
  assert.match(text, /1\. HYPE moves/);
  assert.match(text, /2\. Poly news/);
  assert.match(text, /3\. Loose end/);
  // Order in the string is coins-before-themes-before-other.
  assert.ok(text.indexOf('HYPE moves') < text.indexOf('Poly news'));
  assert.ok(text.indexOf('Poly news') < text.indexOf('Loose end'));

  assert.equal(formatGroupedDigest([], { heading: '# X' }), '# X\nNo matching items.');
});
