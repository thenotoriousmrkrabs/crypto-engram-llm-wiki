import { orderCardsForSummary, formatGroupedDigest } from './cold-store-query.js';

// The summary-channel surface (replaces scrolling the raw firehose). Everything
// here is pure so the label/value mapping and command parsing stay unit-tested;
// bot.js turns `options` into discord.js components and wires the events.
//
// The whole promote round-trip is STATELESS: each select option carries its
// `source:id` marker as the option value, so a selection interaction already
// contains everything promoteItems needs — no server-side message map to keep,
// and it survives bot restarts. Re-selecting is safe because promote dedupes.

export const SUMMARY_MENU_LIMIT = 25; // Discord's hard cap on select-menu options
export const SUMMARY_PROMOTE_ID = 'summary-promote';
const DISCORD_CONTENT_LIMIT = 2000;

// "!summarize" with an optional since-spec: "!summarize", "!summarize 24h",
// "!summarize today", "!summarize 7d". Defaults to 24h. Returns null when the
// message isn't the command, so the handler ignores everything else.
export function parseSummarizeCommand(content) {
  const match = String(content || '').trim().match(/^!summarize(?:\s+(.+))?$/i);
  if (!match) {
    return null;
  }
  return { since: (match[1] || '').trim() || '24h' };
}

export function valueForCard(card) {
  return `${card.source}:${card.id}`;
}

export function refFromValue(value) {
  const at = String(value).indexOf(':');
  if (at === -1) {
    return null;
  }
  return { source: value.slice(0, at), id: value.slice(at + 1) };
}

function truncate(text, max) {
  const clean = String(text || '').trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

// Build the post: the grouped reading text + the select-menu options (capped at
// Discord's 25). Option order and numbering match formatGroupedDigest because
// both derive from orderCardsForSummary, so "item 3" in the text is option 3.
export function buildSummaryPost(cards, { heading } = {}) {
  const { ordered } = orderCardsForSummary(cards);
  const selectable = ordered.slice(0, SUMMARY_MENU_LIMIT);
  const options = selectable.map((card, i) => {
    const facets = [
      card.coins.join(' '),
      card.themes.map((theme) => `#${theme.replace(/\s+/g, '')}`).join(' '),
      card.score != null ? `AI ${card.score}` : ''
    ].filter(Boolean).join(' · ');
    const option = {
      label: truncate(`${i + 1}. ${card.title || 'Untitled'}`, 100),
      value: valueForCard(card)
    };
    if (facets) {
      option.description = truncate(facets, 100);
    }
    return option;
  });

  let content = formatGroupedDigest(cards, { heading });
  const truncated = ordered.length > selectable.length;
  if (truncated) {
    content += `\n\n(Top ${selectable.length} of ${ordered.length} are selectable — narrow with a coin/theme or a shorter window to reach the rest.)`;
  }
  return { content, options, truncated, count: cards.length };
}

// A human-readable receipt for one batch promote.
export function formatPromoteResult({ results = [], promoted = 0, duplicate = 0, failed = 0 } = {}) {
  const lines = results.map((result) => {
    if (result.error) {
      return `⚠️ \`${result.source}:${result.id}\` — ${result.error}`;
    }
    if (result.duplicate) {
      return `↩️ \`${result.source}:${result.id}\` — already in the wiki`;
    }
    if (result.promoted) {
      return `💾 \`${result.source}:${result.id}\` — ${result.rawPath}`;
    }
    return `• \`${result.source}:${result.id}\` — not saved`;
  });
  const head = `Promoted ${promoted} · already-in-wiki ${duplicate} · failed ${failed}`;
  return truncate([head, ...lines].join('\n'), DISCORD_CONTENT_LIMIT);
}

// Discord caps a message at 2000 chars; the grouped digest can exceed that. Split
// on blank-line (item) boundaries so no card is cut mid-line, hard-splitting only
// a single oversized paragraph. Caller sends chunks in order, components on the last.
export function splitForDiscord(text, max = DISCORD_CONTENT_LIMIT - 10) {
  const paragraphs = String(text).split('\n\n');
  const chunks = [];
  let current = '';
  for (const paragraph of paragraphs) {
    const candidate = current ? `${current}\n\n${paragraph}` : paragraph;
    if (candidate.length <= max) {
      current = candidate;
      continue;
    }
    if (current) {
      chunks.push(current);
      current = '';
    }
    if (paragraph.length <= max) {
      current = paragraph;
    } else {
      for (let i = 0; i < paragraph.length; i += max) {
        chunks.push(paragraph.slice(i, i + max));
      }
    }
  }
  if (current) {
    chunks.push(current);
  }
  return chunks.length ? chunks : [''];
}
