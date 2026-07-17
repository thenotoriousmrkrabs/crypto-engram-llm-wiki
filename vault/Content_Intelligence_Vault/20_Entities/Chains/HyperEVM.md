---
type: entity
sources:
  - 00_Inbox/Manual_MD/_Raw_Drops/all_tweets_2026-06-26_07_39_38.md
  - 00_Inbox/Web_Articles/2026-06-26-The-Almanack-of-Hyperliquid.md
confidence: high
published: 2026-06-24
updated: 2026-07-17
tags:
  - hyperliquid
  - hyperevm
---

# HyperEVM

The general-purpose EVM execution layer of Hyperliquid. Its purpose is to make the exchange **programmable** rather than to re-host generic DeFi — Hyperliquid built the exchange (HyperCore) first, so HyperEVM is the application surface around it.

## How it relates to HyperCore

- **Read precompiles** let HyperEVM contracts query [[HyperCore]] state: balances, positions, prices, staking delegations, vault equity.
- **CoreWriter** lets contracts submit actions back to HyperCore.
- Not synchronous with the orderbook: cross-environment actions carry sequencing constraints, delayed writes, and reconciliation between contract state and HyperCore actions.

## Application landscape (per the Four Pillars 2×2)

- **Local EVM finance** (portable patterns): Felix, HyperLend.
- **Core-native extensions** (wrap/tokenize native primitives): Kinetiq, StakedHYPE, Kintsu, HLP wrappers, Unit-linked assets.
- **Programmable HyperCore** (needs EVM *and* HyperCore composition): Rysk, Liminal, Hyperbeat, Valantis Prime; Derive sits adjacent.

Claimed end state: a user-controlled financial account backed by HyperCore as the balance sheet (the "House of All Finance").

## Sources

Central subject of the Four Pillars essay [[what-should-exist-on-hyperevm-four-pillars]]; named as a pillar in [[the-almanack-of-hyperliquid]]. See topic [[Hyperliquid]].
