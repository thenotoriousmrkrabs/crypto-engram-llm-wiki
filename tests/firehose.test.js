import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { PROJECT_ROOT } from '../src/main/utils/paths.js';
import { loadFirehoseConfig } from '../src/main/firehose/config.js';
import { storeItems, readItem, hasItem, itemId } from '../src/main/firehose/cold-store.js';
import { runPullJob } from '../src/main/firehose/pull-job.js';
import { formatItemMessage, parseMarker, postItems } from '../src/main/firehose/discord-poster.js';
import { runPullAndPost } from '../src/main/firehose/pull-and-post.js';
import { promoteItem } from '../src/main/firehose/promote.js';
import { fetchLatestNews, fetchOpenNewsJson } from '../src/main/firehose/opennews-client.js';
import { mapArticleToSourceItem } from '../src/main/firehose/opennews-mapper.js';
import { normalizeSourceItem } from '../src/main/adapters/source-item.js';
import { OpenNewsMCPAdapter } from '../src/main/adapters/opennews-mcp-adapter.js';
import { fetchUserTweets } from '../src/main/firehose/opentwitter-client.js';
import { OpenTwitterMCPAdapter } from '../src/main/adapters/open-twitter-mcp-adapter.js';

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
      json: async () => payload,
      text: async () => (typeof payload === 'string' ? payload : JSON.stringify(payload))
    };
  };
  return { impl, calls };
}

test('fetchLatestNews POSTs the news_search request as a JSON body with Bearer auth', async () => {
  const { impl, calls } = fakeFetchReturning({ data: [{ id: 'a1' }], total: 1 });
  const items = await fetchLatestNews({ token: 'token-6551', limit: 50, fetchImpl: impl });

  assert.deepEqual(items, [{ id: 'a1' }]);
  assert.equal(calls.length, 1);
  const url = new URL(calls[0].url);
  assert.equal(url.origin, 'https://ai.6551.io');
  assert.equal(url.pathname, '/open/news_search');
  // Upstream contract is POST + JSON body — no query string (a GET here 404s).
  assert.equal(url.search, '');
  assert.equal(calls[0].options.method, 'POST');
  assert.equal(calls[0].options.headers.Authorization, 'Bearer token-6551');
  assert.equal(calls[0].options.headers['Content-Type'], 'application/json');
  const body = JSON.parse(calls[0].options.body);
  assert.equal(body.limit, 50);
  assert.equal(body.page, 1);
});

test('fetchOpenNewsJson puts filtered params in the JSON body and requires a token', async () => {
  const { impl, calls } = fakeFetchReturning({ data: [] });
  await fetchOpenNewsJson({
    token: 't',
    endpoint: '/open/news_search',
    params: { q: 'hyperliquid', coins: '', score: undefined, hasCoin: false, page: 0 },
    fetchImpl: impl
  });
  const url = new URL(calls[0].url);
  assert.equal(url.search, '');
  const body = JSON.parse(calls[0].options.body);
  assert.equal(body.q, 'hyperliquid');
  assert.equal('coins' in body, false);
  assert.equal('score' in body, false);
  // meaningful falsey values are preserved
  assert.equal(body.hasCoin, false);
  assert.equal(body.page, 0);

  await assert.rejects(
    fetchOpenNewsJson({ token: '  ', endpoint: '/x', fetchImpl: impl }),
    /bearer token/
  );
});

test('fetchLatestNews surfaces HTTP errors with a safe body preview and rejects malformed payloads', async () => {
  const denied = fakeFetchReturning('unauthorized: token lacks entitlement', { status: 401 });
  await assert.rejects(
    fetchLatestNews({ token: 't', fetchImpl: denied.impl }),
    (error) => {
      assert.match(error.message, /6551 request failed: 401 \/open\/news_search/);
      assert.match(error.message, /unauthorized: token lacks entitlement/);
      return true;
    }
  );

  const malformed = fakeFetchReturning({ unexpected: true });
  await assert.rejects(
    fetchLatestNews({ token: 't', fetchImpl: malformed.impl }),
    /no data array/
  );
});

test('fetchOpenNewsJson still throws the base HTTP error when the body cannot be read', async () => {
  const impl = async () => ({
    ok: false,
    status: 500,
    json: async () => ({}),
    text: async () => {
      throw new Error('stream broken');
    }
  });
  await assert.rejects(
    fetchOpenNewsJson({ token: 't', endpoint: '/open/news_search', fetchImpl: impl }),
    /6551 request failed: 500 \/open\/news_search/
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

test('runPullJob surfaces a duplicate id within one fetch only once', async () => {
  const root = await freshColdStoreRoot();
  const adapter = {
    source: 'opennews',
    fetch: async () => [
      { source_id: 'dup', title: 'first copy' },
      { source_id: 'dup', title: 'second copy' },
      { source_id: 'solo', title: 'other' }
    ]
  };

  const result = await runPullJob({ adapter, coldStoreRoot: root });
  // The cold store wrote 'dup' once, so it must post once, not twice (#2).
  assert.deepEqual(result.newItems.map((item) => item.source_id), ['dup', 'solo']);
});

test('discord poster formats one message per item with a parseable marker', async () => {
  const sent = [];
  const channel = { send: async (content) => sent.push(content) };
  const items = [
    normalizeSourceItem(mapArticleToSourceItem(SAMPLE_ARTICLE), { source: 'opennews' }),
    normalizeSourceItem({ source: 'opennews', source_id: 'n2', title: 'Second item' }, { source: 'opennews' })
  ];

  const { posted } = await postItems({ channel, items });

  assert.equal(posted, 2);
  assert.equal(sent.length, 2);
  assert.match(sent[0], /Hyperliquid lists HIP-4 vaults/);
  assert.match(sent[0], /https:\/\/example\.com\/hip-4/);
  assert.match(sent[0], /`opennews:987654`/);
  assert.match(sent[0], /AI 91 A long/);
  assert.deepEqual(parseMarker(sent[0]), { source: 'opennews', id: '987654' });
  assert.deepEqual(parseMarker(sent[1]), { source: 'opennews', id: 'n2' });
  assert.equal(parseMarker('no marker here'), null);
});

test('discord poster stays under the message length limit', () => {
  const item = {
    source: 'opennews',
    source_id: 'long1',
    title: 'T'.repeat(3000),
    url: 'https://example.com',
    tags: []
  };
  const content = formatItemMessage(item);
  assert.ok(content.length <= 2000);
});

test('long article keeps the save marker so tap-to-save still resolves it', () => {
  const item = {
    source: 'opennews',
    source_id: 'long1',
    title: 'T'.repeat(3000),
    url: 'https://example.com/hip-4',
    tags: []
  };
  const content = formatItemMessage(item);
  assert.ok(content.length <= 2000);
  // url and marker survive even though the title was truncated (#1).
  assert.match(content, /https:\/\/example\.com\/hip-4/);
  assert.deepEqual(parseMarker(content), { source: 'opennews', id: 'long1' });
});

test('parseMarker ignores a backticked pair in the title and takes the marker', () => {
  const item = normalizeSourceItem(
    { source: 'opennews', source_id: 'n9', title: 'ratio `foo:bar` spikes' },
    { source: 'opennews' }
  );
  const content = formatItemMessage(item);
  assert.deepEqual(parseMarker(content), { source: 'opennews', id: 'n9' });
});

test('pull-and-post posts each new item once and nothing on a re-tick', async () => {
  const root = await freshColdStoreRoot();
  const adapter = new OpenNewsMCPAdapter({
    token: 'token-6551',
    fetchLatest: async () => [SAMPLE_ARTICLE]
  });
  const sent = [];
  const channel = { send: async (content) => sent.push(content) };

  const first = await runPullAndPost({ adapter, coldStoreRoot: root, channel });
  assert.equal(first.posted, 1);
  assert.equal(sent.length, 1);
  assert.match(sent[0], /`opennews:987654`/);

  const second = await runPullAndPost({ adapter, coldStoreRoot: root, channel });
  assert.equal(second.posted, 0);
  assert.equal(second.skipped, 1);
  assert.equal(sent.length, 1);

  // The posted item is retrievable from the cold store by its marker id —
  // the exact lookup the tap-to-save handler performs.
  const marker = parseMarker(sent[0]);
  const stored = await readItem({ root, source: marker.source, id: marker.id });
  assert.equal(stored.title, 'Hyperliquid lists HIP-4 vaults');
});

test('promote moves exactly one tapped item from cold store into 00_Inbox, deduped', async () => {
  const coldRoot = await freshColdStoreRoot();
  const vaultRoot = path.join(PROJECT_ROOT, '.tmp-tests', crypto.randomUUID(), 'Content_Intelligence_Vault');
  await fs.mkdir(vaultRoot, { recursive: true });

  // Firehose tick: two items land in the cold store, none in the wiki.
  const adapter = new OpenNewsMCPAdapter({
    token: 'token-6551',
    fetchLatest: async () => [SAMPLE_ARTICLE, { id: 111, text: 'Unpromoted item', ts: 1752700100000 }]
  });
  await runPullJob({ adapter, coldStoreRoot: coldRoot });
  assert.equal(fsSync.existsSync(path.join(vaultRoot, '00_Inbox')), false);

  // The tap: promote one id.
  const first = await promoteItem({ vaultRoot, source: 'opennews', id: '987654', coldStoreRoot: coldRoot });
  assert.equal(first.promoted, true);
  assert.equal(first.duplicate, false);
  assert.match(first.rawPath, /^00_Inbox\/OpenNews\//);
  const rawText = await fs.readFile(path.join(vaultRoot, first.rawPath), 'utf8');
  assert.match(rawText, /Hyperliquid lists HIP-4 vaults/);

  // Same tap again dedupes instead of double-ingesting.
  const again = await promoteItem({ vaultRoot, source: 'opennews', id: '987654', coldStoreRoot: coldRoot });
  assert.equal(again.promoted, false);
  assert.equal(again.duplicate, true);

  // The unpromoted item never crossed the gate (#12)…
  const inboxFiles = await fs.readdir(path.join(vaultRoot, '00_Inbox/OpenNews'));
  assert.equal(inboxFiles.length, 1);
  // …and an unknown id fails loudly.
  await assert.rejects(
    promoteItem({ vaultRoot, source: 'opennews', id: 'nope', coldStoreRoot: coldRoot }),
    /cold store has no item opennews:nope/
  );
});

test('fetchUserTweets POSTs the verified twitter_user_tweets contract', async () => {
  const { impl, calls } = fakeFetchReturning({ data: [{ id: 't1', text: 'gm' }] });
  const tweets = await fetchUserTweets({ token: 'token-6551', username: 'hyperliquidr', maxResults: 5, fetchImpl: impl });

  assert.deepEqual(tweets, [{ id: 't1', text: 'gm' }]);
  const url = new URL(calls[0].url);
  assert.equal(url.pathname, '/open/twitter_user_tweets');
  assert.equal(calls[0].options.method, 'POST');
  assert.equal(calls[0].options.headers.Authorization, 'Bearer token-6551');
  assert.deepEqual(JSON.parse(calls[0].options.body), {
    username: 'hyperliquidr',
    maxResults: 5,
    product: 'Latest',
    includeReplies: false,
    includeRetweets: false
  });

  await assert.rejects(fetchUserTweets({ token: 't', username: ' ', fetchImpl: impl }), /username/);
  const denied = fakeFetchReturning({}, { status: 403 });
  await assert.rejects(
    fetchUserTweets({ token: 't', username: 'x', fetchImpl: denied.impl }),
    /6551 request failed: 403/
  );
});

test('OpenTwitterMCPAdapter maps watched accounts to SourceItems; empty watch is silent', async () => {
  const tweet = {
    id: '90001',
    text: 'HIP-4 vaults are live',
    createdAt: '2026-07-17T09:00:00.000Z',
    userScreenName: 'HyperliquidR',
    retweetCount: 12,
    favoriteCount: 88
  };
  const requested = [];
  const adapter = new OpenTwitterMCPAdapter({
    token: 'token-6551',
    usernames: ['HyperliquidR'],
    fetchTweets: async ({ username }) => {
      requested.push(username);
      return [tweet];
    }
  });

  const items = await adapter.fetch();
  assert.deepEqual(requested, ['HyperliquidR']);
  assert.equal(items.length, 1);
  assert.equal(items[0].source, 'x_watchlist');
  assert.equal(items[0].source_id, '90001');
  assert.equal(items[0].url, 'https://x.com/HyperliquidR/status/90001');
  assert.equal(items[0].author_handle, 'HyperliquidR');
  assert.equal(items[0].created_at, '2026-07-17T09:00:00.000Z');
  assert.equal(items[0].raw.favoriteCount, 88);
  assert.ok(items[0].dedupe_key.length > 0);

  const idle = new OpenTwitterMCPAdapter({ token: 'token-6551' });
  assert.deepEqual(await idle.fetch(), []);
});
