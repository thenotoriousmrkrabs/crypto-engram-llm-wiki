# 6551 MCP Source Reference

Fact sheet for the three 6551Team MCP servers we plan to wire as firehose sources
(deferred #7/#8 slice). All three share the **6551 backend** (`https://ai.6551.io`)
and a **single premium `OPENNEWS_TOKEN`** the user already holds.

> **Accuracy caveat:** the tool/parameter/event names below are extracted from each
> repo's README. Fields marked _(implied)_ were not fully specified in the README and
> must be confirmed against the actual server code when wiring the adapter. Do not
> treat this as a frozen contract — treat it as the map for the grilling.

Repos:
- https://github.com/6551Team/opennews-mcp
- https://github.com/6551Team/opentwitter-mcp
- https://github.com/6551Team/daily-news

---

## How it works behind (all three)

Each repo is a **Python MCP server** run via `uv`. It is a thin translator:

```
your client (Claude Code / node adapter)
        │  MCP call (stdio)  or  raw WebSocket
        ▼
  6551 MCP server (python, uv)         ← the token lives here
        │  HTTPS REST  /  WSS
        ▼
  6551 backend  (https://ai.6551.io)   ← does the real aggregating + AI scoring
```

- **Pull path:** you call a tool (e.g. `get_latest_news`) → server hits a 6551 REST
  endpoint → returns JSON. Nothing arrives unless you ask.
- **Push path (opennews + opentwitter only):** you open a WebSocket to 6551, send a
  `subscribe` message describing what you want, and the server **pushes events at you**
  as they happen until you unsubscribe. This is the "blast to Discord" path.
- The **AI scoring** (impact score 0–100, grade A+…C, long/short/neutral signal,
  bilingual summaries) is computed **on 6551's side**, not locally. We receive it; we
  don't compute it.

Token is one Bearer credential (`OPENNEWS_TOKEN`), passed either as an env var to the
MCP process or as `api_token` in `config.json`. On the WebSocket it goes in the URL:
`?token=YOUR_TOKEN`.

---

## 1. opennews-mcp — news / market firehose

**Role:** 85+ sources across 6 engines. The workhorse.
**Push:** yes (`news_wss`). **Pull:** yes. **Token:** required.

### Tools (pull)
| Tool | Params | Returns |
|---|---|---|
| `get_news_sources` | — | full engine tree, all 6 categories + 85+ sources |
| `list_news_types` | — | flat list of source codes for filtering |
| `get_latest_news` | — | latest across all sources |
| `search_news` | `keyword` | full-text search |
| `search_news_by_coin` | coin symbol (`BTC`,`ETH`,…) | articles for one coin |
| `get_news_by_source` | `engine_type`, `news_type` | articles from one named source |
| `get_news_by_engine` | engine type | articles for one engine |
| `search_news_advanced` | `coins[]`, `keywords[]`, `engine_types[]` | multi-filter |
| `get_high_score_news` | score threshold (0–100) _(implied)_ | high AI-impact articles |
| `get_news_by_signal` | `long`/`short`/`neutral` | filtered by AI signal |
| `search_companies` | `keyword`/`ticker`/`CIK` | public-company candidates |
| `get_company_info` | company id | available SEC filings/reports/transcripts |
| `get_company_report_text` | report type | full document text |
| `get_crypto_holdings` | institution/wallet | on-chain holdings evidence |
| `get_crypto_holding_changes` | institution/wallet | holdings deltas |

### Real-time (push)
`subscribe_latest_news` — params `coins[]`, `engine_type[]`.

- **WSS:** `wss://ai.6551.io/open/news_wss?token=YOUR_TOKEN`
- **Subscribe (JSON-RPC):** `method: "news.subscribe"`, params
  `{ engineTypes: { news:["Bloomberg","CoinDesk"], onchain:[] }, coins:["BTC","ETH"], hasCoin:true }`
  (empty array = all of that type; omit coins = all coins).
- **Heartbeat:** send `ping` → get `pong`.
- **Unsubscribe:** `method: "news.unsubscribe"`.

**Push events:**
- `news.update` — `id, text, newsType, engineType, link, coins[{symbol,market_type,match}], ts(ms)`
- `news.ai_update` — same + per-coin `score`/`signal`/`grade` + top-level `aiRating{score,grade,signal}`
- `strategy.triggered` — **Max tier only**; `strategy{id,name,...}`, `aiRating`, optional `relatedAddress`

### Config
| Env | Req | Purpose |
|---|---|---|
| `OPENNEWS_TOKEN` | **yes** | Bearer token (6551.io/mcp) |
| `OPENNEWS_API_BASE` | no | override REST base |
| `OPENNEWS_WSS_URL` | no | override WSS url |
| `OPENNEWS_MAX_ROWS` | no | max rows (default 100) |

`config.json`: `{ api_base_url:"https://ai.6551.io", wss_url:"wss://ai.6551.io/open/news_wss", api_token, max_rows:100 }`

### Article shape (pull + push)
`id, text, newsType, engineType, link, coins[{symbol,market_type,match,score,signal,grade}], aiRating{score,grade,signal,status,summary(zh),enSummary}, ts`

### Engines / sources
- **News (55):** Bloomberg, Reuters, FT, CNBC, CoinDesk, Cointelegraph, The Block, Blockworks, Decrypt, DL News, a16z, TechCrunch, Twitter/X, Telegram, U.S. Treasury, ECB, Coinbase, Binance, jin10, 6551News, BWEnews, AGGRNEWS, Velo, … (55 total)
- **Listing (9):** Binance, Coinbase, OKX, Bybit, Upbit, Bithumb, Robinhood, Hyperliquid, Aster
- **OnChain (2):** Hyperliquid Whale Trade, Hyperliquid Large Position
- **Meme (1):** Twitter
- **Market (6):** Price Change, Funding Rate, Funding Rate Difference, Large Liquidation, Market Trends, OI Change
- **Prediction (12):** CORRELATION_LOGICAL, SMART_MONEY_TRADE, PRICE_SPIKE, CLUSTER_ENTRY, WHALE_POSITION, NEW_WALLET_TRADE, INSIDER_PATTERN, CORRELATION_NARRATIVE, CORRELATION_HEDGE, CORRELATION_ENTITY_GEO, CORRELATION_CAUSAL, SETTLEMENT_ARBITRAGE

### Run
```bash
claude mcp add opennews -e OPENNEWS_TOKEN=<token> -- uv --directory /path/to/opennews-mcp run opennews-mcp
```

---

## 2. opentwitter-mcp — X / KOL monitoring

**Role:** watch specific X accounts + query tweets. **Watch-driven** — it pushes only
what you tell it to watch.
**Push:** yes (`twitter_wss`). **Pull:** yes. **Token:** required (same `OPENNEWS_TOKEN`).

### Tools (pull)
| Tool | Params | Returns |
|---|---|---|
| `get_twitter_user` | `username` | profile |
| `get_twitter_user_by_id` | `user_id` | profile |
| `get_twitter_user_tweets` | `username` | recent tweets |
| `search_twitter` | keyword | basic tweet search |
| `search_twitter_advanced` | multi-filter | refined search |
| `get_twitter_follower_events` | — | follower/unfollower events |
| `get_twitter_deleted_tweets` | `username` | removed tweets |
| `get_twitter_kol_followers` | — | KOL follower lists |
| `get_twitter_article_by_id` | `id` | X article |
| `get_twitter_tweet_by_id` | `id` | tweet + nested replies/quotes |
| `get_twitter_quote_tweets_by_id` | `id` | quote tweets |
| `get_twitter_retweet_users_by_id` | `id` | retweeters |
| `get_twitter_watch` | — | **currently watched accounts** |
| `add_twitter_watch` | `username`, event-type opts | **start watching an account** |
| `delete_twitter_watch` | `username` | stop watching |

### Real-time (push)
- **WSS:** `wss://ai.6551.io/open/twitter_wss?token=YOUR_TOKEN`
- **Subscribe:** `method: "twitter.subscribe"`
- **Events pushed** (`method: "twitter.event"`): `NEW_TWEET, NEW_TWEET_REPLY,
  NEW_TWEET_QUOTE, NEW_RETWEET, NEW_FOLLOWER, NEW_UNFOLLOWER, UPDATE_NAME,
  UPDATE_DESCRIPTION, UPDATE_AVATAR, UPDATE_BANNER, DELETE, TWEET_TOPPING, CA,
  SYSTEM, TRANSLATE, CA_CREATE`
- **Event payload:** `id, twAccount, twUserName, profileUrl, eventType, content, ca, remark, createdAt`

**Key mechanic:** the firehose is **the set of accounts on your watch list**, not all of
X. You seed it with `add_twitter_watch(username)` per KOL. This is what finally gives
`config/watchlists.yaml` a real job.

### Config
`OPENNEWS_TOKEN` (req, from app.newsliquid.com/mcp), `TWITTER_API_BASE` (opt),
`TWITTER_MAX_ROWS` (opt, 100). `config.json`: `{ api_base_url, api_token, max_rows }`.

### Response shapes
- **User:** `userId, screenName, name, description, followersCount, friendsCount, statusesCount, verified`
- **Tweet:** `id, text, createdAt, retweetCount, favoriteCount, replyCount, userScreenName, hashtags[], urls[]`

### Run
```bash
claude mcp add twitter -e OPENNEWS_TOKEN=<token> -- uv --directory /path/to/opentwitter-mcp run twitter-mcp
```

---

## 3. daily-news — free thin digest  ⚠️ likely dropped

**Role:** free, no-key, **pull-only** subset of the same 6551 backend.
**Under the premium token, opennews strictly dominates this** (opennews has the same
data + push + signals + on-chain). Kept here only as a documented free fallback if the
token ever lapses.

### Tools (pull only)
| Tool | Params | Returns |
|---|---|---|
| `get_news_categories` | — | categories + subcategories |
| `get_hot_news` | `category`, `subcategory` | hot news + trending tweets |

### REST endpoints
- `GET /open/free_categories` → `[{key,name,name_zh,description,subcategories[]}]`
- `GET /open/free_hot?category=&subcategory=` → `{success,category,subcategory,news{items[...]},tweets{items[...]}}`
  - news item: `id,title,source,link,score,grade,signal,summary_zh,summary_en,coins[],published_at`
  - tweet item: `author,handle,content,url,metrics,posted_at,relevance`

### Config
`DAILY_NEWS_API_BASE` (opt, default `https://ai.6551.io`), `DAILY_NEWS_MAX_ROWS` (opt, 100). No token.

### Run
```bash
claude mcp add daily-news -- uv --directory /path/to/daily-news run daily-news-mcp
```

---

## What this means for our architecture

- **One token, two live sources.** opennews (broad firehose) + opentwitter (your KOL
  watch list). daily-news is redundant → drop unless free-fallback is wanted.
- **Push maps to per-source Discord channels (#21 amendment):**
  `#opennews` ← `news_wss` blast · `#opentwitter` ← `twitter_wss` blast (watched accounts)
  · daily-news would need a node poller (no push) — another reason to drop it.
- **`config/watchlists.yaml` becomes real** — it seeds `add_twitter_watch` per KOL.
- **We never compute scores/signals** — 6551 does; we receive `aiRating` and may use it
  as a **sort** hint in a channel, never a wiki gate (#10 amendment / #21).
- **Wiki boundary unchanged (#11/#12):** MCP → Discord (read) + cold store; only
  human-promoted items cross into the wiki. These MCPs do **not** auto-feed the wiki.
