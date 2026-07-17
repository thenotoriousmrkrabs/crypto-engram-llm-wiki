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
---

# HyperCore

Hyperliquid's native exchange engine — where trading, collateral, and risk live. Native spot and perpetual order books, protocol-owned liquidity, and live trading activity all sit here. It is the balance sheet that [[HyperEVM]] is designed to make programmable.

## Role in the architecture

- Holds the canonical state: balances, positions, prices, staking delegations, vault equity.
- Exposed to HyperEVM contracts through **read precompiles** (query state) and **CoreWriter** (submit actions back).
- Provides exchange-grade liquidity and the risk engine; liquidations route through HyperCore depth, and structured products hedge through Core liquidity.

The Four Pillars thesis: the strict standard for a "programmable HyperCore" app is that contracts custody assets, read HyperCore state, and use CoreWriter in the execution path.

## Sources

Central to [[what-should-exist-on-hyperevm-four-pillars]]; named as "HyperCore liquidity" in [[the-almanack-of-hyperliquid]]. See topic [[Hyperliquid]].
