# Firehose Filters & On-Demand Watchlist

How the opennews firehose is filtered, and the curated lists for the future
on-demand `/news` search layer. Overriding goal: fewest tokens for the most
relevant news — filter at the request, not after.

## Standing filter (always-on firehose) — BUILT

The scheduled pull applies a **quality floor** server-side via the request
`score` param (opennews rates every article 0–100 in `aiRating.score`).

- Env: `FIREHOSE_MIN_SCORE` (default **70**). Set `0` to disable and pull everything.
- Shape chosen: **broad quality firehose** — `score ≥ 70` only, no coin/keyword
  gate. Nothing coin-tagged-or-not gets hidden; coins + themes below are the
  on-demand / routing layer, not the pull gate.

Why not gate the firehose on coins: a `coins` filter returns only articles
tagged to those assets, which would hide non-coin-tagged theme stories
(Polymarket, Kalshi, neobank, RWA, TradFi). Kept broad on purpose.

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

## Coins watchlist (for on-demand `coins` queries / future routing)

Passed as the `coins` list param (comma-separated) when you want a coin-scoped pull:

```
HYPE, BTC, BNB, ETH, SOL, USDT, USDC, ZEC, USDS, USDe
```

## Theme watchlist (for on-demand `/news <query>` — one term per request)

`q` is a single full-text string per request; it does NOT OR a list, so themes
are searched **one at a time on demand**, never as a standing auto-pull.

**Precise terms** (distinctive strings — clean hits, good `q` values):

```
HIP-4, HIP-3, x402, Polymarket, Kalshi, Hyperliquid, Collector Crypt,
MiCA, PerpDex, neobank, stablecoin, prediction market, RWAs, memecoin,
crypto cards, Robinhood, Onchain data
```

**Broad/noisy terms** (match many unrelated articles — better as human sort
tags than as `q` filters; `Base` and `L1`/`L2` are especially ambiguous):

```
DeFi, Yield, Lending, Borrowing, Vault, Wallet, Listings, Privacy,
Governance, Perpetuals, Smart Contract, TradFi, RWA, Base, L1, L2, CEX
```

## Not built yet

- `/news <query>` slash command (on-demand search; deterministic relay, no AI).
- Multi-channel routing (e.g. a coins-gated signal channel alongside the broad
  firehose) — needs the routing layer.
