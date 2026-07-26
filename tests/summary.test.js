import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseSummarizeCommand,
  buildSummaryPost,
  formatPromoteResult,
  splitForDiscord,
  valueForCard,
  refFromValue,
  SUMMARY_MENU_LIMIT
} from '../src/main/firehose/summary.js';

function card({ id, title = id, coins = [], themes = [], score = 90 }) {
  return {
    id, source: 'opennews', title, url: `https://example.com/${id}`,
    coins, themes, score, grade: 'A', signal: 'long', published: '', tsMs: 0, text: title
  };
}

test('parseSummarizeCommand reads the trigger and defaults the window to 24h', () => {
  assert.deepEqual(parseSummarizeCommand('!summarize'), { since: '24h' });
  assert.deepEqual(parseSummarizeCommand('!summarize 7d'), { since: '7d' });
  assert.deepEqual(parseSummarizeCommand('  !Summarize today '), { since: 'today' });
  assert.equal(parseSummarizeCommand('just chatting'), null);
  assert.equal(parseSummarizeCommand('!summarizer 24h'), null); // must be the exact command
});

test('valueForCard and refFromValue round-trip the source:id marker', () => {
  const ref = { source: 'opennews', id: 'abc:123' }; // id may itself contain a colon
  const value = valueForCard({ source: ref.source, id: ref.id });
  assert.equal(value, 'opennews:abc:123');
  assert.deepEqual(refFromValue(value), ref); // split on the FIRST colon only
});

test('buildSummaryPost maps options to markers, numbered to match the text', () => {
  const { content, options, truncated } = buildSummaryPost([
    card({ id: 'c1', title: 'HYPE up', coins: ['HYPE'] }),
    card({ id: 't1', title: 'Poly news', themes: ['Polymarket'] })
  ], { heading: '# S' });

  assert.equal(truncated, false);
  assert.equal(options.length, 2);
  assert.deepEqual(options.map((o) => o.value), ['opennews:c1', 'opennews:t1']);
  assert.equal(options[0].label, '1. HYPE up');   // coin item is #1
  assert.equal(options[1].label, '2. Poly news'); // theme item is #2
  assert.match(options[0].description, /HYPE · AI 90/);
  assert.match(content, /📈 Watchlist Coins \(1\)/);
});

test('buildSummaryPost caps selectable options at Discord\'s 25 and flags the rest', () => {
  const many = Array.from({ length: 30 }, (_, i) => card({ id: `k${i}`, coins: ['BTC'] }));
  const { options, truncated, content } = buildSummaryPost(many, {});
  assert.equal(options.length, SUMMARY_MENU_LIMIT);
  assert.equal(truncated, true);
  assert.match(content, /Top 25 of 30 are selectable/);
});

test('formatPromoteResult renders a per-item receipt', () => {
  const text = formatPromoteResult({
    promoted: 1, duplicate: 1, failed: 1,
    results: [
      { source: 'opennews', id: 'a', promoted: true, rawPath: '00_Inbox/OpenNews/x.md' },
      { source: 'opennews', id: 'b', duplicate: true },
      { source: 'opennews', id: 'c', error: 'cold store has no item opennews:c' }
    ]
  });
  assert.match(text, /Promoted 1 · already-in-wiki 1 · failed 1/);
  assert.match(text, /💾 `opennews:a` — 00_Inbox\/OpenNews\/x\.md/);
  assert.match(text, /↩️ `opennews:b` — already in the wiki/);
  assert.match(text, /⚠️ `opennews:c` — cold store has no item/);
});

test('splitForDiscord splits on item boundaries under the cap', () => {
  const para = 'X'.repeat(1200);
  const chunks = splitForDiscord(`${para}\n\n${para}\n\n${para}`, 1990);
  assert.ok(chunks.length >= 2);
  assert.ok(chunks.every((chunk) => chunk.length <= 1990));
  // No blank-line boundary is lost mid-chunk beyond the cap.
  assert.ok(chunks.join('\n\n').includes(para));
});
