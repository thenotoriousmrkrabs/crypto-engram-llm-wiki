---
type: source-summary
sources:
  - 00_Inbox/Manual_MD/_Raw_Drops/all_tweets_2026-06-26_07_39_38.md
confidence: high
published: 2026-06-24
updated: 2026-07-17
tags:
  - hyperliquid
  - hyperevm
---

# What Should Exist on HyperEVM? (Four Pillars)

Research essay by @ponyo_fp (Four Pillars), arguing what kind of application *should* be built on HyperEVM given that Hyperliquid built the exchange first and the EVM second.

## Thesis

Most L1s start with blockspace and hope apps create financial gravity later. Hyperliquid inverted this: it built the exchange (native spot + perp order books, trader mindshare, protocol-owned liquidity, live HyperCore activity) first, so **HyperEVM's purpose is to make the exchange programmable**, not to re-host generic DeFi.

A valuable HyperEVM-native app should do three things:
1. Express logic HyperCore cannot (needs general-purpose EVM).
2. Depend on state other chains do not have (HyperCore composability).
3. Make Hyperliquid more useful as a financial venue.

The plumbing: **read precompiles** let contracts query HyperCore state (balances, positions, prices, staking delegations, vault equity); **CoreWriter** lets contracts submit actions back to HyperCore. This is not synchronous with the orderbook — cross-environment actions carry sequencing constraints, delayed writes, and reconciliation between contract state and HyperCore. That constraint narrows the design space but is also "the wedge."

## The 2×2 matrix

Two axes: (a) does the app need general-purpose EVM logic? (b) does it directly compose with HyperCore state/execution? Four quadrants:

- **Local EVM finance** — needs contracts, but patterns are portable (AMMs, money markets, CDPs, routers, options venues, leverage, yield). Examples: **Felix**; **HyperLend** starts here as a main credit venue. The necessary base layer, easy to underrate.
- **Core-native extensions** — depend on Hyperliquid, but the EVM role is to wrap/tokenize/compose a native primitive. Examples: **Kinetiq**, **StakedHYPE**, **Kintsu**, **HLP wrappers**, **Unit-linked assets**. Makes assets inside Hyperliquid more useful as collateral.
- **Programmable HyperCore** — needs EVM logic *and* depends on HyperCore state/execution; where exchange activity becomes productized. Pointing this way: **Rysk** (options → volatility income), **Liminal** (tokenized HL strategies), **Hyperbeat** (delta-neutral Core + ERC20). **Valantis Prime** is a public-beta example (a HyperEVM smart account as a control layer over HyperCore via CoreWriter — permissions, agents, session keys, guardians). **Derive** sits *adjacent* (its HyperEVM bridge vault makes HYPE/kHYPE useful as collateral, but its trading/margin/settlement live on its own stack — not native programmable HyperCore).
- (The strict standard for "programmable HyperCore": contracts custody assets, read HyperCore state, and use CoreWriter in the execution path. Still early; product direction ≠ verified architecture.)

## End state: financial accounts

The most valuable HyperEVM apps "may not feel like applications at all — they may feel like accounts." Deposit one asset (BTC/ETH/SOL/HYPE) once, then trade on HyperCore, borrow on HyperEVM, earn via a vault, hedge via a perp, and fund spending — from the same balance. CEXes achieve unified accounts but with a closed ledger and opaque risk engine; general-purpose chains give users control but a fragmented stack. Hyperliquid's claimed sweet spot: a user-controlled account backed by HyperCore as the balance sheet — the "House of All Finance" vision.

## Caveats

- Explicitly *not* a ranking of everything that grows Hyperliquid; HIP-3 markets, builder codes, portfolio margin, Unit assets, and the HyperCore fee loop are set aside. Scope is only "what belongs on HyperEVM."
- Author discloses possible personal holdings and Four Pillars / FP Validated interests in assets or protocols discussed.
- Protocol placements are the author's architectural judgment as of writing, not verified on-chain audits.
