import test from 'node:test';
import assert from 'node:assert/strict';
import { loadFirehoseConfig } from '../src/main/firehose/config.js';

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
