---
type: topic
sources:
  - 00_Inbox/Manual_MD/_Raw_Drops/all_tweets_2026-06-26_07_39_38.md
  - 00_Inbox/Web_Articles/2026-06-26-The-Almanack-of-Hyperliquid.md
  - 00_Inbox/X_Bookmarks/2026-06-26-HyperliquidR-shares-The-Almanack-of-Hyperliquid.md
  - 00_Inbox/X_Bookmarks/2026-06-26-Hyperliquid-HIP-4-may-change-builder-incentives.md
confidence: high
published: 2026-06-26
updated: 2026-07-17
tags:
  - hyperliquid
  - hyperevm
---

# Hyperliquid

Hyperliquid is a crypto exchange-plus-chain that inverted the usual L1 playbook: it built a performant native exchange first and made it programmable second. The two-layer architecture is the organizing idea of this topic.

## Architecture

- **[[HyperCore]]** — the native exchange engine: spot + perp order books, collateral, risk, protocol-owned liquidity. The canonical state and balance sheet.
- **[[HyperEVM]]** — the general-purpose EVM layer whose job is to make HyperCore programmable, via read precompiles (query Core state) and CoreWriter (write actions back). Not synchronous with the orderbook.
- **[[HYPE]]** — native token, functioning as an alignment mechanism and a collateral asset (incl. liquid-staking forms like StakedHYPE / kHYPE).

## Current understanding

- **What belongs on HyperEVM** (Four Pillars, @ponyo_fp): the differentiated apps are not forked lending with a new frontend but credit, asset management, payments, and structured finance built around an exchange ledger contracts can read from and write to. Mapped on a 2×2 (needs EVM logic? composes with HyperCore?): *local EVM finance* (Felix, HyperLend), *core-native extensions* (Kinetiq, StakedHYPE, Kintsu, HLP wrappers, Unit assets), and *programmable HyperCore* (Rysk, Liminal, Hyperbeat, Valantis Prime; Derive adjacent). End state: a unified user-controlled financial account backed by HyperCore — the "House of All Finance." See [[what-should-exist-on-hyperevm-four-pillars]].
- **Why Hyperliquid is different** (The Almanack, @paramonoww): pillars are a performant exchange, HyperCore liquidity, HyperEVM programmability, HYPE alignment, and community-led distribution. Framing-level in the vault — only the intro was captured. See [[the-almanack-of-hyperliquid]].
- **Distribution signal:** 30%+ of Hyperliquid users now arrive via non-main-app frontends (builder codes) — surfaced in the Almanack clip's sidebar.

## Open leads / low-confidence

- **HIP-4** — proposed to reshape builder incentives, HyperEVM activity, and liquidity routing, but only a one-line bookmark exists ([[hyperliquid-hip-4-builder-incentives]], low confidence). Mechanism unknown; needs a primary source.
- The essays also reference **HIP-3** markets, builder codes, portfolio margin, and the HyperCore fee loop without detail in the captured raw.
