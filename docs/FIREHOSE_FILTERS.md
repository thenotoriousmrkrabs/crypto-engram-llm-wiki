# Firehose Filters & On-Demand Watchlist

How the opennews firehose is filtered, and the curated lists for the future
on-demand `/news` search layer. Overriding goal: fewest tokens for the most
relevant news — filter at the request, not after.

## Standing filter (curated union feed) — BUILT

The scheduled tick is **not** the raw firehose. It fans out into narrow pulls
and posts their **union**, deduped by id:

- **one coin-list pull** — `coins: [FIREHOSE_COINS]` → articles tagged to your assets.
- **one full-text pull per theme** — `q: "<theme>"`, one request each, because
  theme stories (Polymarket, prediction markets, neobank, RWA) carry no coin tag.
- every pull also applies the **quality floor** `score ≥ FIREHOSE_MIN_SCORE`
  (default **70**; opennews rates each article 0–100 in `aiRating.score`).

Nothing outside the two lists can reach the channel — that is what removes the
"too much irrelevant news" problem. A single API request can only *narrow*
(`coins` AND `q` = fewer results) and `q` is one string, so "my coins OR my
themes" is unreachable in one call; the union is assembled client-side across
`1 + N` pulls per tick.

Config (both comma-separated, in `.env`):

- `FIREHOSE_COINS` — unset uses the default coin list; `none` drops the coin pull.
- `FIREHOSE_THEMES` — unset uses the default theme list; `none` drops the theme pulls.
- With **both** empty/`none` it falls back to one **broad** `score`-only pull.

Each posted message is tagged so the mixed feed stays sliceable — `· HYPE ·`
(watched coins the item touches, from its coin tags) and `· #Polymarket ·`
(the theme pull that surfaced it). That is the facet a channel-history search
or Hermes filters on.

## Cadence & recall — BUILT

- **Interval:** `FIREHOSE_PULL_INTERVAL_MINUTES` (default **360** = 4x/day, evenly
  spaced from bot start — not clock times; exact hours would need a scheduler).
- **Recall across a long gap:** each pull grabs everything newer than what the
  cold store already holds, so the gap between pulls is covered — *up to* the
  API's ~100-row page cap per query. To stay safe at 4x/day, each query pages
  newest→older until it reaches an all-already-seen page (gap covered), capped
  at `FIREHOSE_MAX_PAGES` (default **3** = ~300-item margin per query per pull).
- **Only failure mode:** a single query producing more than `maxPages x 100`
  score≥70 items inside one gap — the overflow past the cap is dropped. Raise
  `FIREHOSE_MAX_PAGES` or shorten the interval if a hot coin/theme ever does.

## Reading-surface hygiene — BUILT

The Discord message is a display layer over the raw evidence; the cold store
keeps everything verbatim, but the channel is cleaned up:

- **HTML stripped** — `<br/>`, `<span>`, `<b>`, and HTML entities are removed
  and collapsed to one line (opennews `text` often ships raw HTML).
- **Headline, not wall-of-text** — the title is capped at ~300 chars; the full
  text stays in the cold store and Discord's own link/embed preview.
- **Language gate** — `FIREHOSE_LANGS` (default `en,zh`). Detection is coarse
  (Latin→en, CJK→zh, everything else→other). Other-language items are still
  **stored/seen** (never re-fetched), they just aren't posted. Set `all` to post
  every language. On a 378-item sample: 361 en/zh posted, 17 other-script gated.

## Coins watchlist (`FIREHOSE_COINS`) — the coin-list pull

One `coins` pull per tick returns articles tagged to these assets:

```
HYPE, BTC, BNB, ETH, SOL, USDT, USDC, ZEC, USDS, USDe
```

## Theme watchlist (`FIREHOSE_THEMES`) — one full-text pull each

`q` is a single full-text string per request and does NOT OR a list, so each
theme is its own pull; the tick runs all of them and merges. The full list is
standing (the user chose coverage over precision — noisy terms can be trimmed
later by editing `FIREHOSE_THEMES`):

```
HIP-4, stablecoin, prediction market, Polymarket, Kalshi, Hyperliquid, HIP-3,
neobank, crypto cards, Collector Crypt, TradFi, PerpDex, DeFi, Yield, Base,
Robinhood, RWAs, Smart Contract, Layer 1, Layer 2, CEX, Wallet, Listings,
Memecoin, MiCA, Privacy, Governance, Perpetuals, Onchain data, x402, Lending,
Borrowing, Vault
```

**Precise vs noisy.** These are clean, distinctive hits — good signal:

```
HIP-4, HIP-3, x402, Polymarket, Kalshi, Hyperliquid, Collector Crypt, MiCA,
PerpDex, neobank, stablecoin, prediction market, RWAs, Memecoin, crypto cards,
Robinhood, Onchain data
```

These match many loosely-related articles; if the feed feels noisy, trim these
first (`Base` and `Layer 1`/`Layer 2` are the most ambiguous):

```
DeFi, Yield, Lending, Borrowing, Vault, Wallet, Listings, Privacy, Governance,
Perpetuals, Smart Contract, TradFi, Base, Layer 1, Layer 2, CEX
```

## Not built yet

- `/news <query>` slash command (ad-hoc one-off search; deterministic relay, no AI).
- Multi-channel routing (e.g. a separate coins-only signal channel alongside the
  curated feed) — needs the routing layer.
