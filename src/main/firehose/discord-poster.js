import { itemId } from './cold-store.js';
import { cleanText } from './text-clean.js';

// Discord posting (issue #3 commit 9). The channel handle is injected, so
// tests use a fake and the suite never talks to Discord. Each message embeds
// a `source:id` marker line — that is how a later tap on the message is
// resolved back to its cold-store item, surviving bot restarts with no
// in-memory message map.

const DISCORD_MESSAGE_LIMIT = 2000;
// A readable headline, not the whole article. The full text still lives in the
// cold store and in Discord's own link/embed preview under the message.
const DISPLAY_TITLE_MAX = 300;

export function itemMarker(item) {
  return `${item.source || 'unknown'}:${itemId(item)}`;
}

export function parseMarker(messageContent) {
  // The marker is the LAST backtick pair in the message; a title can contain
  // its own `word:word` backticks, so match all and take the last (#4).
  const matches = [...String(messageContent || '').matchAll(/`([a-z0-9_-]+):([^`\s]+)`/gi)];
  if (matches.length === 0) {
    return null;
  }
  const match = matches[matches.length - 1];
  return { source: match[1], id: match[2] };
}

export function formatItemMessage(item) {
  const rating = item.raw?.aiRating;
  const ratingLine = rating && rating.score !== undefined
    ? ` · AI ${rating.score} ${rating.grade || ''} ${rating.signal || ''}`.trimEnd()
    : '';
  const tags = (item.tags || []).filter((tag) => tag !== item.source).join('/');

  const url = String(item.url || '').trim();
  const markerLine = `\`${itemMarker(item)}\`${tags ? ` · ${tags}` : ''}${ratingLine}`;

  // The marker line is how a later tap resolves back to the cold-store item,
  // so it must ALWAYS survive (#1). Titles carry the full article text and can
  // blow past the limit alone, so reserve room for url + marker and truncate
  // only the title — never the tail.
  const tail = [url, markerLine].filter((line) => line !== '');
  const tailText = tail.length ? `\n${tail.join('\n')}` : '';
  const titleBudget = DISCORD_MESSAGE_LIMIT - tailText.length;

  // Strip HTML/entities and collapse to one line, then cap to a readable
  // headline so a full-article "title" no longer dumps a wall of text.
  const cleaned = cleanText(item.title) || 'Untitled';
  const headline = cleaned.length > DISPLAY_TITLE_MAX
    ? `${cleaned.slice(0, DISPLAY_TITLE_MAX - 1)}…`
    : cleaned;
  const rawTitle = `📰 **${headline}**`;
  const titleLine = rawTitle.length <= titleBudget
    ? rawTitle
    : `${rawTitle.slice(0, Math.max(0, titleBudget - 1))}…`;

  return `${titleLine}${tailText}`;
}

export async function postItems({ channel, items = [] }) {
  let posted = 0;
  for (const item of items) {
    await channel.send(formatItemMessage(item));
    posted += 1;
  }
  return { posted };
}
