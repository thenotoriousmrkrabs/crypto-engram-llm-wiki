import { fetchLatestNews } from '../firehose/opennews-client.js';
import { mapArticleToSourceItem } from '../firehose/opennews-mapper.js';
import { normalizeSourceItem } from './source-item.js';

// Real opennews adapter (issue #3 commit 5): composes the 6551 REST client
// and the article mapper behind the same fetch() contract every adapter
// shares. The client is injectable so tests never touch the network.
//
// The feed is CURATED, not the raw firehose: each tick fans out into narrow
// pulls — one coin-list pull plus one full-text pull per theme — and the
// result is their UNION, deduped by id. That is why "lots of irrelevant news"
// cannot leak in: nothing is pulled that isn't a watched coin or a watched
// theme. With neither list configured it falls back to one broad pull so the
// bot still works.
export class OpenNewsMCPAdapter {
  constructor({
    token,
    limit = 100,
    minScore = 0,
    coins = [],
    themes = [],
    maxPages = 3,
    isSeen = () => false,
    fetchLatest = fetchLatestNews
  } = {}) {
    this.source = 'opennews';
    this.token = token;
    this.limit = limit;
    this.minScore = minScore;
    this.coins = coins;
    this.themes = themes;
    // How deep each query pages back per tick. The API returns the newest 100
    // per page; a longer pull interval can accumulate more than one page of new
    // items, so we page newest->older until a page is entirely already-seen
    // (the gap is covered) or this cap is hit (safety bound on API calls).
    this.maxPages = maxPages;
    this.isSeen = isSeen;
    this.fetchLatest = fetchLatest;
  }

  // The set of narrow pulls this adapter runs per tick, in order: the coin-list
  // pull first, then one pull per theme. `theme` is the provenance label used
  // to tag whatever that pull returns.
  queries() {
    const list = [];
    if (this.coins.length > 0) {
      list.push({ theme: null, coins: this.coins, q: undefined });
    }
    for (const theme of this.themes) {
      list.push({ theme, coins: undefined, q: theme });
    }
    if (list.length === 0) {
      list.push({ theme: null, coins: undefined, q: undefined });
    }
    return list;
  }

  async fetch() {
    const watchlist = new Set(this.coins.map((coin) => String(coin).toUpperCase()));
    const byId = new Map();
    // Per-query volume, for the tick log: how much each pull fetched (raw) and
    // how many new items it was the first to surface. Lets us see which of the
    // ~18 pulls drives the volume and trim it surgically.
    this.lastStats = [];
    for (const query of this.queries()) {
      this.lastStats.push(await this.pullQuery(query, watchlist, byId));
    }
    return [...byId.values()];
  }

  // One query, paged newest->older. Stop when a page brings no already-unseen
  // item (we've paged back into the previous tick), when a short page signals
  // there is no more data, or when the page cap is reached.
  async pullQuery(query, watchlist, byId) {
    const label = query.theme || (query.coins ? 'coins' : 'broad');
    let fetched = 0;
    let fresh = 0;
    for (let page = 1; page <= this.maxPages; page += 1) {
      const articles = await this.fetchLatest({
        token: this.token,
        limit: this.limit,
        score: this.minScore,
        coins: query.coins,
        q: query.q,
        page
      });
      if (articles.length === 0) {
        break;
      }
      fetched += articles.length;

      let unseenOnPage = 0;
      for (const article of articles) {
        const item = normalizeSourceItem(mapArticleToSourceItem(article), { source: this.source });
        const seen = this.isSeen(item);
        if (!seen) {
          unseenOnPage += 1;
        }
        // Credit "new" to the first query to surface an unseen item, so the
        // per-query new counts sum to the tick's posted total (no double-count).
        if (this.collect(item, article, query, watchlist, byId) && !seen) {
          fresh += 1;
        }
      }

      if (unseenOnPage === 0 || articles.length < this.limit) {
        break;
      }
    }
    return { label, fetched, fresh };
  }

  // Returns true when this is the first time the item has been seen this tick.
  collect(item, article, query, watchlist, byId) {
    const key = item.source_id || item.dedupe_key;
    const existing = byId.get(key);
    if (existing) {
      // Same article surfaced by another pull/page — union its theme provenance.
      addTheme(existing, query.theme);
      return false;
    }
    // First sighting: record which of the user's coins it touches (from the
    // article's own coin tags) and which theme pull found it.
    item.watchlist_coins = matchWatchlist(article, watchlist);
    item.matched_themes = [];
    addTheme(item, query.theme);
    byId.set(key, item);
    return true;
  }
}

function addTheme(item, theme) {
  if (theme && !item.matched_themes.includes(theme)) {
    item.matched_themes.push(theme);
  }
}

// The article's raw coin tags are noisy (a single item can carry ~18 tickers,
// many of them equities), so keep only the ones on the user's watchlist.
function matchWatchlist(article, watchlist) {
  if (watchlist.size === 0) {
    return [];
  }
  const coins = Array.isArray(article?.coins) ? article.coins : [];
  const hits = [];
  for (const coin of coins) {
    const symbol = String(coin?.symbol || '').toUpperCase();
    if (watchlist.has(symbol) && !hits.includes(symbol)) {
      hits.push(symbol);
    }
  }
  return hits;
}
