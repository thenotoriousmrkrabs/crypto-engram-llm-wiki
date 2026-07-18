import { itemId } from './cold-store.js';

// Discord posting (issue #3 commit 9). The channel handle is injected, so
// tests use a fake and the suite never talks to Discord. Each message embeds
// a `source:id` marker line — that is how a later tap on the message is
// resolved back to its cold-store item, surviving bot restarts with no
// in-memory message map.

const DISCORD_MESSAGE_LIMIT = 2000;

export function itemMarker(item) {
  return `${item.source || 'unknown'}:${itemId(item)}`;
}

export function parseMarker(messageContent) {
  const match = String(messageContent || '').match(/`([a-z0-9_-]+):([^`\s]+)`/i);
  if (!match) {
    return null;
  }
  return { source: match[1], id: match[2] };
}

export function formatItemMessage(item) {
  const rating = item.raw?.aiRating;
  const ratingLine = rating && rating.score !== undefined
    ? ` · AI ${rating.score} ${rating.grade || ''} ${rating.signal || ''}`.trimEnd()
    : '';
  const tags = (item.tags || []).filter((tag) => tag !== item.source).join('/');

  const lines = [
    `📰 **${String(item.title || 'Untitled').trim()}**`,
    String(item.url || '').trim(),
    `\`${itemMarker(item)}\`${tags ? ` · ${tags}` : ''}${ratingLine}`
  ].filter((line) => line !== '');

  const content = lines.join('\n');
  return content.length <= DISCORD_MESSAGE_LIMIT
    ? content
    : `${content.slice(0, DISCORD_MESSAGE_LIMIT - 1)}…`;
}

export async function postItems({ channel, items = [] }) {
  let posted = 0;
  for (const item of items) {
    await channel.send(formatItemMessage(item));
    posted += 1;
  }
  return { posted };
}
