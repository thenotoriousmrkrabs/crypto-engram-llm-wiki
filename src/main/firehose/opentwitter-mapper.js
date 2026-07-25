// Pure mapper: one 6551 tweet -> one SourceItem-shaped object (issue #3
// commit 15), mirroring the opennews mapper. The full tweet survives under
// raw; source x_watchlist routes raw evidence into 00_Inbox/X_Watchlist.

export function mapTweetToSourceItem(tweet = {}, { username = '' } = {}) {
  const text = String(tweet.text || '').trim();
  const handle = String(tweet.userScreenName || username || '').trim();
  const id = tweet.id === undefined || tweet.id === null ? '' : String(tweet.id);

  return {
    source: 'x_watchlist',
    source_id: id,
    url: handle && id ? `https://x.com/${handle}/status/${id}` : '',
    title: text || 'Untitled tweet',
    text,
    author_handle: handle,
    created_at: toIsoDate(tweet.createdAt),
    tags: ['x_watchlist'],
    raw: tweet
  };
}

function toIsoDate(value) {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
}
