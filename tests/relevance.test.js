import test from 'node:test';
import assert from 'node:assert/strict';
import { contentKey, dedupeByContent, isNoise } from '../src/main/firehose/relevance.js';
import { normalizeUrl } from '../src/main/utils/dedupe.js';

function noiseItem({ title, coins = [], themes = [] }) {
  return { title, text: '', watchlist_coins: coins, matched_themes: themes };
}

test('isNoise drops big-cap-only macro/geopolitical headlines', () => {
  assert.equal(isNoise(noiseItem({ title: 'Missiles hit oil tanker near Iran', coins: ['BTC'] })), true);
  assert.equal(isNoise(noiseItem({ title: 'US completes latest strikes on Iranian infrastructure', coins: ['BTC', 'ETH'] })), true); // stem catches "Iranian"
  assert.equal(isNoise(noiseItem({ title: 'Fed signals a rate cut as inflation cools', coins: ['ETH'] })), true);
  assert.equal(isNoise(noiseItem({ title: '胡塞武装导弹袭击两艘沙特油轮', coins: ['BTC'] })), true); // Chinese geopolitical
});

test('isNoise keeps anything with crypto context or a non-big-cap / theme', () => {
  // crypto keep-guard wins even next to a war word (the safe bias)
  assert.equal(isNoise(noiseItem({ title: 'AFX bridge exploited for $24M USDC', coins: ['ETH'] })), false);
  assert.equal(isNoise(noiseItem({ title: 'Trump vows to bomb a bridge for every ship Iran hits', coins: ['BTC'] })), false); // "bridge" keeps it — documents the conservative choice
  // a non-big-cap tag = your core interest, exempt
  assert.equal(isNoise(noiseItem({ title: 'Missiles hit oil tanker near Iran', coins: ['HYPE'] })), false);
  // a matched theme = curated narrative, exempt
  assert.equal(isNoise(noiseItem({ title: 'Iran tensions rattle markets', coins: ['BTC'], themes: ['stablecoin'] })), false);
  // no noise word at all = kept
  assert.equal(isNoise(noiseItem({ title: 'Bitcoin ETF sees record inflows', coins: ['BTC'] })), false);
});

test('normalizeUrl folds twitter/x host aliases and strips tracking params', () => {
  assert.equal(normalizeUrl('https://twitter.com/a/status/123'), 'https://x.com/a/status/123');
  assert.equal(normalizeUrl('https://mobile.twitter.com/a/status/123'), 'https://x.com/a/status/123');
  assert.equal(normalizeUrl('https://www.x.com/a/status/123'), 'https://x.com/a/status/123');
  assert.equal(normalizeUrl('https://x.com/a/status/123?s=20&t=abc'), 'https://x.com/a/status/123');
  assert.equal(normalizeUrl('https://site.com/p?id=7&utm_source=tw'), 'https://site.com/p?id=7');
});

test('contentKey identifies the same tweet across hosts', () => {
  const id = '2081363919428616615';
  const k = `tweet:${id}`;
  assert.equal(contentKey({ url: `https://x.com/solana/status/${id}` }), k);
  assert.equal(contentKey({ url: `https://twitter.com/solana/status/${id}` }), k);
  assert.equal(contentKey({ url: `https://x.com/OTHER/status/${id}?s=09` }), k); // handle differs, id is what matters
});

test('contentKey falls back to normalized url, then title', () => {
  assert.equal(
    contentKey({ url: 'https://theblock.co/post/409383/zilliqa?utm_source=x' }),
    'url:https://theblock.co/post/409383/zilliqa'
  );
  assert.equal(
    contentKey({ title: 'Robinhood Platinum Card is Here', author_handle: '@HOOD' }),
    'title:hood:robinhood-platinum-card-is-here'
  );
});

test('dedupeByContent collapses duplicates, keeping the best-rated newest copy', () => {
  const id = '999';
  const items = [
    { url: `https://twitter.com/a/status/${id}`, score: 75, tsMs: 100, tag: 'old-low' },
    { url: `https://x.com/a/status/${id}`, score: 90, tsMs: 200, tag: 'best' },
    { url: `https://x.com/a/status/${id}?s=1`, score: 80, tsMs: 300, tag: 'mid' },
    { url: 'https://site.com/unique', score: 70, tsMs: 50, tag: 'keep-distinct' }
  ];
  const out = dedupeByContent(items);
  assert.equal(out.length, 2); // three copies of the tweet -> one, plus the distinct url
  const tweet = out.find((i) => i.tag !== 'keep-distinct');
  assert.equal(tweet.tag, 'best'); // highest score wins the tie-break
});
