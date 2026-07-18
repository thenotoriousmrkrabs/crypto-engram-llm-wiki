import test from 'node:test';
import assert from 'node:assert/strict';
import { loadFirehoseConfig } from '../src/main/firehose/config.js';
import { fetchLatestNews, fetchOpenNewsJson } from '../src/main/firehose/opennews-client.js';

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
