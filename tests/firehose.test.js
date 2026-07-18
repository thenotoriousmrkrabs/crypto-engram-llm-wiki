import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { PROJECT_ROOT } from '../src/main/utils/paths.js';
import { loadFirehoseConfig } from '../src/main/firehose/config.js';
import { storeItems, readItem, hasItem, itemId } from '../src/main/firehose/cold-store.js';
import { runPullJob } from '../src/main/firehose/pull-job.js';
import { fetchLatestNews, fetchOpenNewsJson } from '../src/main/firehose/opennews-client.js';
import { mapArticleToSourceItem } from '../src/main/firehose/opennews-mapper.js';
import { normalizeSourceItem } from '../src/main/adapters/source-item.js';
import { OpenNewsMCPAdapter } from '../src/main/adapters/opennews-mcp-adapter.js';

const SAMPLE_ARTICLE = {
  id: 987654,
  text: 'Hyperliquid lists HIP-4 vaults',
  newsType: 'CoinDesk',
  engineType: 'news',
  link: 'https://example.com/hip-4',
  coins: [{ symbol: 'HYPE', market_type: 'cex', match: 'title', score: 91, signal: 'long', grade: 'A' }],
  aiRating: { score: 91, grade: 'A', signal: 'long', status: 'done', enSummary: 'HIP-4 summary' },
  ts: 1752700000000
};

const FULL_ENV = {
  OPENNEWS_TOKEN: 'token-6551',
  DISCORD_BOT_TOKEN: 'token-discord',
  DISCORD_CHANNEL_ID: '123456789'
};

test('loadFirehoseConfig returns parsed config with the default pull interval', () => {
  const config = loadFirehoseConfig({ env: FULL_ENV });
  assert.deepEqual(config, {
    opennewsToken: 'token-6551',
    discordBotToken: 'token-discord',
    discordChannelId: '123456789',
    pullIntervalMs: 20 * 60 * 1000
  });
});

test('loadFirehoseConfig honors a custom pull interval in minutes', () => {
  const config = loadFirehoseConfig({
    env: { ...FULL_ENV, FIREHOSE_PULL_INTERVAL_MINUTES: '15' }
  });
  assert.equal(config.pullIntervalMs, 15 * 60 * 1000);
});

test('loadFirehoseConfig names every missing required var', () => {
  assert.throws(
    () => loadFirehoseConfig({ env: { DISCORD_BOT_TOKEN: 'x' } }),
    (error) => {
      assert.match(error.message, /OPENNEWS_TOKEN/);
      assert.match(error.message, /DISCORD_CHANNEL_ID/);
      assert.doesNotMatch(error.message, /DISCORD_BOT_TOKEN/);
      return true;
    }
  );
});

test('loadFirehoseConfig treats blank values as missing', () => {
  assert.throws(
    () => loadFirehoseConfig({ env: { ...FULL_ENV, OPENNEWS_TOKEN: '   ' } }),
    /OPENNEWS_TOKEN/
  );
});

test('loadFirehoseConfig rejects a non-positive or non-numeric interval', () => {
  for (const bad of ['0', '-5', 'soon']) {
    assert.throws(
      () => loadFirehoseConfig({ env: { ...FULL_ENV, FIREHOSE_PULL_INTERVAL_MINUTES: bad } }),
      /FIREHOSE_PULL_INTERVAL_MINUTES/
    );
  }
});

function fakeFetchReturning(payload, { status = 200 } = {}) {
  const calls = [];
  const impl = async (url, options) => {
    calls.push({ url, options });
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => payload
    };
  };
  return { impl, calls };
}

test('fetchLatestNews assembles the news_search request with Bearer auth', async () => {
  const { impl, calls } = fakeFetchReturning({ data: [{ id: 'a1' }], total: 1 });
  const items = await fetchLatestNews({ token: 'token-6551', limit: 50, fetchImpl: impl });

  assert.deepEqual(items, [{ id: 'a1' }]);
  assert.equal(calls.length, 1);
  const url = new URL(calls[0].url);
  assert.equal(url.origin, 'https://ai.6551.io');
  assert.equal(url.pathname, '/open/news_search');
  assert.equal(url.searchParams.get('limit'), '50');
  assert.equal(url.searchParams.get('page'), '1');
  assert.equal(calls[0].options.headers.Authorization, 'Bearer token-6551');
});

test('fetchOpenNewsJson omits empty params and requires a token', async () => {
  const { impl, calls } = fakeFetchReturning({ data: [] });
  await fetchOpenNewsJson({
    token: 't',
    endpoint: '/open/news_search',
    params: { q: 'hyperliquid', coins: '', score: undefined },
    fetchImpl: impl
  });
  const url = new URL(calls[0].url);
  assert.equal(url.searchParams.get('q'), 'hyperliquid');
  assert.equal(url.searchParams.has('coins'), false);
  assert.equal(url.searchParams.has('score'), false);

  await assert.rejects(
    fetchOpenNewsJson({ token: '  ', endpoint: '/x', fetchImpl: impl }),
    /bearer token/
  );
});

test('fetchLatestNews surfaces HTTP errors and malformed payloads', async () => {
  const denied = fakeFetchReturning({}, { status: 401 });
  await assert.rejects(
    fetchLatestNews({ token: 't', fetchImpl: denied.impl }),
    /6551 request failed: 401/
  );

  const malformed = fakeFetchReturning({ unexpected: true });
  await assert.rejects(
    fetchLatestNews({ token: 't', fetchImpl: malformed.impl }),
    /no data array/
  );
});

test('mapArticleToSourceItem maps the 6551 article shape onto a SourceItem', () => {
  const item = mapArticleToSourceItem(SAMPLE_ARTICLE);

  assert.equal(item.source, 'opennews');
  assert.equal(item.source_id, '987654');
  assert.equal(item.url, 'https://example.com/hip-4');
  assert.equal(item.title, 'Hyperliquid lists HIP-4 vaults');
  assert.equal(item.created_at, new Date(1752700000000).toISOString());
  assert.deepEqual(item.tags, ['opennews', 'news', 'CoinDesk']);
  // The whole article — coins and aiRating included — survives under raw
  // for later confidence use; it is never a page field (#10/#24).
  assert.deepEqual(item.raw, SAMPLE_ARTICLE);
  assert.equal(item.raw.aiRating.score, 91);
});

test('mapArticleToSourceItem tolerates a minimal article and normalizes cleanly', () => {
  const item = mapArticleToSourceItem({ id: 'x1' });
  assert.equal(item.source_id, 'x1');
  assert.equal(item.title, 'Untitled opennews item');
  assert.equal(item.created_at, '');
  assert.deepEqual(item.tags, ['opennews']);

  const normalized = normalizeSourceItem(item, { source: 'opennews' });
  assert.equal(normalized.source, 'opennews');
  assert.ok(normalized.dedupe_key.length > 0);
});

test('OpenNewsMCPAdapter composes client and mapper behind the adapter contract', async () => {
  const seen = [];
  const fakeFetchLatest = async ({ token, limit }) => {
    seen.push({ token, limit });
    return [SAMPLE_ARTICLE];
  };
  const adapter = new OpenNewsMCPAdapter({ token: 'token-6551', limit: 25, fetchLatest: fakeFetchLatest });

  const items = await adapter.fetch();

  assert.deepEqual(seen, [{ token: 'token-6551', limit: 25 }]);
  assert.equal(adapter.source, 'opennews');
  assert.equal(items.length, 1);
  assert.equal(items[0].source, 'opennews');
  assert.equal(items[0].source_id, '987654');
  assert.equal(items[0].title, 'Hyperliquid lists HIP-4 vaults');
  assert.ok(items[0].dedupe_key.length > 0);
  assert.equal(items[0].raw.aiRating.grade, 'A');
});

async function freshColdStoreRoot() {
  const root = path.join(PROJECT_ROOT, '.tmp-tests', crypto.randomUUID(), 'firehose');
  await fs.mkdir(root, { recursive: true });
  return root;
}

test('cold store persists items once and is idempotent on re-store', async () => {
  const root = await freshColdStoreRoot();
  const items = [
    { source_id: 'n1', title: 'one' },
    { source_id: 'n2', title: 'two' },
    { source_id: 'n3', title: 'three' }
  ];

  const first = await storeItems({ root, source: 'opennews', items });
  assert.deepEqual(first.stored, ['n1', 'n2', 'n3']);
  assert.deepEqual(first.skipped, []);

  const again = await storeItems({ root, source: 'opennews', items });
  assert.deepEqual(again.stored, []);
  assert.deepEqual(again.skipped, ['n1', 'n2', 'n3']);

  const files = (await fs.readdir(path.join(root, 'opennews'))).sort();
  assert.deepEqual(files, ['n1.json', 'n2.json', 'n3.json']);
});

test('cold store round-trips an item by id and reports presence', async () => {
  const root = await freshColdStoreRoot();
  const item = { source_id: 'a9', title: 'HIP-4', raw: { aiRating: { score: 91 } } };
  await storeItems({ root, source: 'opennews', items: [item] });

  assert.equal(hasItem({ root, source: 'opennews', id: 'a9' }), true);
  assert.equal(hasItem({ root, source: 'opennews', id: 'missing' }), false);
  assert.deepEqual(await readItem({ root, source: 'opennews', id: 'a9' }), item);
  assert.equal(await readItem({ root, source: 'opennews', id: 'missing' }), null);
});

test('cold store hashes unsafe ids and rejects id-less items', async () => {
  const root = await freshColdStoreRoot();
  const evil = { source_id: '../escape', title: 'bad' };
  const { stored } = await storeItems({ root, source: 'opennews', items: [evil] });
  assert.deepEqual(stored, ['../escape']);

  const files = await fs.readdir(path.join(root, 'opennews'));
  assert.equal(files.length, 1);
  assert.match(files[0], /^[0-9a-f]{32}\.json$/);
  assert.deepEqual(await readItem({ root, source: 'opennews', id: '../escape' }), evil);

  assert.throws(() => itemId({ title: 'no id' }), /source_id or dedupe_key/);
});

test('runPullJob stores new items and returns nothing on the second tick', async () => {
  const root = await freshColdStoreRoot();
  const adapter = {
    source: 'opennews',
    fetch: async () => [
      { source_id: 'p1', title: 'first' },
      { source_id: 'p2', title: 'second' }
    ]
  };

  const first = await runPullJob({ adapter, coldStoreRoot: root });
  assert.equal(first.source, 'opennews');
  assert.equal(first.fetched, 2);
  assert.equal(first.skipped, 0);
  assert.deepEqual(first.newItems.map((item) => item.source_id), ['p1', 'p2']);

  const second = await runPullJob({ adapter, coldStoreRoot: root });
  assert.equal(second.fetched, 2);
  assert.equal(second.skipped, 2);
  assert.deepEqual(second.newItems, []);

  // A later tick with one fresh item surfaces only that item.
  adapter.fetch = async () => [
    { source_id: 'p2', title: 'second' },
    { source_id: 'p3', title: 'third' }
  ];
  const third = await runPullJob({ adapter, coldStoreRoot: root });
  assert.deepEqual(third.newItems.map((item) => item.source_id), ['p3']);
});
