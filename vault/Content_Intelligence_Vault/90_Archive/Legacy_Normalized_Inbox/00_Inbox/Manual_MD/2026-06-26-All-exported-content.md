---
type: manual_md
source: manual_md
source_url: "https://x.com/FourPillarsFP/status/2069998951378702843"
source_id: 00_Inbox/Manual_MD/_Raw_Drops/all_tweets_2026-06-26_07_39_38.md
title: "[Crypto/Issue] What Should Exist on HyperEVM?"
author: 
author_handle: ponyo_fp
created_at: "2026-06-24T21:19:43.000Z"
captured_at: "2026-06-26T14:40:52.236Z"
ingested_at: "2026-06-26T14:58:40.177Z"
topic: hyperliquid
entities:
  - Hyperliquid
  - HyperEVM
  - Wallets
chains:
  - Hyperliquid
  - HyperEVM
tokens:
  - ETH
  - BTC
narratives:
  - "Hyperliquid ecosystem"
  - "Wallet strategy"
tags:
  - manual_md
  - hyperliquid
  - protocol
  - chain
  - product
status: inbox
relevance_score: 77
content_potential: 62
dedupe_key: "manual_md:file:00_inbox/manual_md/_raw_drops/all_tweets_2026-06-26_07_39_38.md:c01873e4f566013852d09ddad9149e0794b7ef33452a94b228d4f09f0b6f26c3"
raw_source: 00_Inbox/Manual_MD/_Raw_Drops/all_tweets_2026-06-26_07_39_38.md
---

# Summary

HyperEVM should be evaluated as the smart contract layer that lets applications read and use HyperCore’s trading, collateral, positions, and risk.

# Why It Matters

This item matched V1 rules for hyperliquid and is queued for human or Hermes review.

# Key Details

### Article: : : [Crypto/Issue] What Should Exist on HyperEVM?

Written by @ponyo\_fp 

## Key Takeaways

- HyperEVM should be evaluated as the smart contract layer that lets applications read and use HyperCore’s trading, collateral, positions, and risk.
- The right way to judge a HyperEVM app is to ask two questions. Why does it need EVM, and why does it need Hyperliquid?
- Basic apps such as swaps, lending, and asset wrappers are necessary, but the real differentiation comes from products that cannot work the same way without HyperCore.
- The long-term end state is an integrated account where one balance can move across trading, borrowing, yield, hedging, and payments.

Join the Four Pillars Telegram group to get the latest crypto insights:

[https://t.me/FourPillarsGlobal](<https://t.me/FourPillarsGlobal>)

# 1. Exchange First

Most smart contract platforms begin with blockspace and work backwards. They launch infrastructure, subsidize liquidity, court developers, and hope applications eventually create enough financial gravity to justify the chain.

Hyperliquid began from the other side. It first built the exchange, with native spot and perpetual order books, trader mindshare, protocol owned liquidity systems, and activity already flowing through HyperCore. This changes what HyperEVM is supposed to become. HyperEVM is not merely another place to redeploy familiar DeFi contracts.

Its purpose is to make the exchange programmable.

This piece is not a ranking of everything that can grow Hyperliquid. HIP 3 markets, builder codes, portfolio margin, native spot and perp liquidity, Unit assets, quote asset competition, and the fee loop around HyperCore may matter as much or more. The question I'm trying to answer here is solely about what should exist specifically on HyperEVM.

In my mind a valuable HyperEVM native application should do three things:

1. It should express logic HyperCore cannot (need general purpose EVM)
1. depend on state other chains do not have (HyperCore composability)
1. make Hyperliquid more useful as a financial venue 

HyperCore is where trading, collateral, and risk live. HyperEVM is where application logic can be written. Read precompiles let contracts query HyperCore state such as balances, positions, prices, staking delegations, and vault equity. CoreWriter lets contracts submit actions back to HyperCore.

This combination effectively turns the exchange into a native input for applications. Collateral, execution, settlement, and distribution can all sit closer to the same ledger.

![Article Image](<https://pbs.twimg.com/media/HLoZIwubQAA90tM.jpg>)

That does not mean every HyperEVM application needs to be exotic. Ecosystems need familiar primitives before they can support complex ones. Users need to swap, borrow, lend, hedge, lever, rebalance, and exit. The local financial surface keeps capital inside the system and makes HyperEVM usable.

But it also means the deeper opportunity lies somewhere other than forked lending with a new frontend. It is credit, asset management, payments, and structured finance built around an exchange ledger that smart contracts can read from and write to. That is the part no generic EVM can copy by simply attracting liquidity incentives.

CoreWriter also does not make HyperEVM a synchronous extension of the orderbook. Cross environment actions involve sequencing constraints, delayed writes, and reconciliation between smart contract state and HyperCore actions. Builders have to manage failed actions, delayed execution, collateral accounting, and risk across two execution environments. This narrows the design space, but it also creates the wedge.

## 2. The 2x2 Matrix

The HyperEVM economy is better understood through a two by two. One axis asks whether an application needs general purpose EVM logic, the other asks whether it directly composes with HyperCore state or execution.

This is more useful than sorting protocols by product label. A lending market, options venue, vault, or staking product can land in different places depending on how it is built. The category name is less important than the dependency the product cannot remove.

![Article Image](<https://pbs.twimg.com/media/HLoZLa5aAAAX2vA.jpg>)

## 2.1 Local EVM Finance

Local EVM finance needs smart contracts, but the product patterns are mostly portable. AMMs, money markets, CDPs, routers, options venues, leverage products, and yield markets sit here. Felix is one of the recognizable examples. HyperLend also begins here as one of the main credit venues on HyperEVM, though parts of its roadmap point toward programmable HyperCore.

This quadrant is easy to underrate because the designs are familiar, but that would be wrong. Every financial center needs banks, brokers, liquidity venues, and risk transfer markets before more complex balance sheet products can scale. Portability make these applications the base layer of user activity.

## 2.2 Core Native Extensions

Core native extensions depend more directly on Hyperliquid, but the EVM role is usually to wrap, tokenize, or compose a native primitive. Kinetiq, StakedHYPE, Kintsu, HLP wrappers, Unit linked assets, and similar products sit here. Their job is to make assets inside Hyperliquid more useful.

This quadrant is important because collateral is the raw material for everything else. Money markets need assets users want to borrow against. Structured products need assets that can be pledged or hedged. Financial accounts need balances that can move across functions instead of remaining trapped in isolated venues.

## 2.3 Programmable HyperCore

Programmable HyperCore is where applications need EVM logic and also depend on HyperCore state or execution. This is where exchange activity starts becoming productized. Rysk points in this direction by turning options into volatility income on assets users already own. Liminal points in this direction by packaging Hyperliquid based strategies into tokenized products. Hyperbeat points in this direction through delta neutral exposures that combine Core positions with ERC20 composability.

Derive sits adjacent to this map rather than inside the native programmable HyperCore bucket. Its HyperEVM bridge vault makes HYPE and kHYPE useful as collateral for options and perps, but the core trading, margin, and settlement logic live on Derive’s own stack. It can still help Hyperliquid by expanding the use of HYPE collateral. It should not be confused with native programmable HyperCore.

The stricter version of programmable HyperCore is still early. Several teams are experimenting in this direction, but product direction should not be confused with verified architecture. The standard should be whether contracts custody assets, read HyperCore state, and use CoreWriter as part of the execution path.

Valantis Prime is a notable public beta example of this direction. It uses a HyperEVM smart account as a control layer for HyperCore actions through CoreWriter, with permissions, agents, session keys, guardians, and action level constraints around activity that ultimately touches HyperCore. That makes the account itself a programmable interface to the exchange.

HyperLend and Rysk point toward the same frontier from different angles. HyperLend points from credit through L1 spot borrowing, liquid HLP, and unified account design. Rysk points from volatility through onchain income products and liquidity reinforcement around Hyperliquid perps. Both are meaningful experiments, but the standard should remain strict.

## 3. Financial Accounts as the End State

The most valuable HyperEVM applications may not feel like applications at all. They may feel like accounts.

Today, crypto users still manage financial activity across separate surfaces. One balance sits on an exchange for trading. Another sits in a wallet for DeFi. Vault shares represent yield. Borrowing capacity lives inside a money market. Hedging requires a separate venue. Payments, if they exist at all, are another layer on top. The fragmentation is not only a UX problem. It reflects the fact that liquidity, collateral, execution, and risk usually live in different systems.

HyperEVM has a chance to compress those systems into the account itself. A user should be able to deposit BTC, ETH, SOL, HYPE, or another asset once. From that same balance, the user can trade on HyperCore, borrow on HyperEVM, earn through a vault, hedge through a perp, and fund spending from a payment account. The product is not the bridge between these functions. The product is the balance that can move across them.

Centralized exchanges already understand this better than most crypto applications. Their accounts feel unified because trading, margin, lending, and yield sit inside one controlled environment. The problem is that the ledger is closed, the risk engine is opaque, and outside developers cannot freely build against the account. General purpose chains have the inverse problem. Users control the account, but the financial stack around it is fragmented. Liquidity, execution, credit, yield, and distribution are open, but rarely unified.

Hyperliquid can occupy the sweet spot. HyperCore provides exchange grade liquidity and risk infrastructure. HyperEVM provides the open application surface around it. The result is a user controlled financial account backed by HyperCore as the balance sheet, and ultimately the strongest version of the “House of All Finance” vision.

The proof should show up at the account layer. Collateral follows the user across trading, borrowing, saving, hedging, and spending. Risk is priced from live HyperCore state. Liquidations route through HyperCore depth. Structured products hedge through Core liquidity. ERC20s represent claims on lending, vault, or portfolio margin activity inside the system.

The first wave of HyperEVM makes the ecosystem usable. The next wave makes HyperCore programmable.

Disclaimer:

The author of this report may have personal holdings or financial interests in assets or tokens discussed herein. However, the author affirms that no transactions have conducted using material non-public information obtained in the course of research or drafting. This report is intended solely for general information purposes and does not constitute legal, business, investment, or tax advice. It should not be used as a basis for making any investment decisions or as guidance for accounting, legal, or tax matters. Any references to specific assets or securities are made for informational purposes only and should not be construed as an offer, solicitation, or recommendation to invest. The opinions expressed herein are those of the author and may not reflect the views of any affiliated institutions, organizations, or individuals. The opinions and analyses expressed herein are subject to change without prior notice. In addition, beyond the individual disclosures included in each report, Four Pillars, may hold existing or prospective investments in some of the assets or protocols discussed herein. Furthermore, FP Validated, a division of Four Pillars, may already be operating as a node in certain networks or protocols discussed herein or may do so in the future. Please see [here](<https://validated.4pillars.io/protocols>) for FP Validated’s participating network disclosures and [here](<https://research.4pillars.io/en/policy/transparency>) for broader disclosure details.

![Image](https://pbs.twimg.com/media/HLoai5xacAAxk75.jpg)
![Image](https://pbs.twimg.com/media/HLoZIwubQAA90tM.jpg)
![Image](https://pbs.twimg.com/media/HLoZLa5aAAAX2vA.jpg)

# Related Narratives

- Hyperliquid ecosystem
- Wallet strategy

# Related Entities

- Hyperliquid
- HyperEVM
- Wallets

# Content Angles

- Turn this into a short observation if the source proves high signal.
- Compare the claim against follow-up sources before publishing.

# Follow-up Questions

- What is the second confirming source?
- Does this change a market, protocol, product, or regulatory narrative?

# Raw Source / Notes

Source URL: https://x.com/FourPillarsFP/status/2069998951378702843

{
  "path": "00_Inbox/Manual_MD/_Raw_Drops/all_tweets_2026-06-26_07_39_38.md",
  "content_hash": "c01873e4f566013852d09ddad9149e0794b7ef33452a94b228d4f09f0b6f26c3",
  "metadata": {
    "Source": "https://x.com/FourPillarsFP/status/2069998951378702843",
    "Created At": "2026-06-24_21-19-43",
    "Folder": "unsorted",
    "Post Type": "Article",
    "Views": "10876",
    "Bookmarks": "38",
    "Likes": "45",
    "Quotes": "5",
    "Replies": "6",
    "Reposts": "5"
  },
  "text": "# All exported content\n\n## Post 1\n\n```yaml\nSource: \"https://x.com/FourPillarsFP/status/2069998951378702843\"\nCreated At: \"2026-06-24_21-19-43\"\nFolder: \"unsorted\"\nPost Type: \"Article\"\nViews: 10876\nBookmarks: 38\nLikes: 45\nQuotes: 5\nReplies: 6\nReposts: 5\n```\n\n### Article: : : [Crypto/Issue] What Should Exist on HyperEVM?\n\nWritten by @ponyo\\_fp \n\n## Key Takeaways\n\n- HyperEVM should be evaluated as the smart contract layer that lets applications read and use HyperCore’s trading, collateral, positions, and risk.\n- The right way to judge a HyperEVM app is to ask two questions. Why does it need EVM, and why does it need Hyperliquid?\n- Basic apps such as swaps, lending, and asset wrappers are necessary, but the real differentiation comes from products that cannot work the same way without HyperCore.\n- The long-term end state is an integrated account where one balance can move across trading, borrowing, yield, hedging, and payments.\n\nJoin the Four Pillars Telegram group to get the latest crypto insights:\n\n[https://t.me/FourPillarsGlobal](<https://t.me/FourPillarsGlobal>)\n\n# 1. Exchange First\n\nMost smart contract platforms begin with blockspace and work backwards. They launch infrastructure, subsidize liquidity, court developers, and hope applications eventually create enough financial gravity to justify the chain.\n\nHyperliquid began from the other side. It first built the exchange, with native spot and perpetual order books, trader mindshare, protocol owned liquidity systems, and activity already flowing through HyperCore. This changes what HyperEVM is supposed to become. HyperEVM is not merely another place to redeploy familiar DeFi contracts.\n\nIts purpose is to make the exchange programmable.\n\nThis piece is not a ranking of everything that can grow Hyperliquid. HIP 3 markets, builder codes, portfolio margin, native spot and perp liquidity, Unit assets, quote asset competition, and the fee loop around HyperCore may matter as much or more. The question I'm trying to answer here is solely about what should exist specifically on HyperEVM.\n\nIn my mind a valuable HyperEVM native application should do three things:\n\n1. It should express logic HyperCore cannot (need general purpose EVM)\n1. depend on state other chains do not have (HyperCore composability)\n1. make Hyperliquid more useful as a financial venue \n\nHyperCore is where trading, collateral, and risk live. HyperEVM is where application logic can be written. Read precompiles let contracts query HyperCore state such as balances, positions, prices, staking delegations, and vault equity. CoreWriter lets contracts submit actions back to HyperCore.\n\nThis combination effectively turns the exchange into a native input for applications. Collateral, execution, settlement, and distribution can all sit closer to the same ledger.\n\n![Article Image](<https://pbs.twimg.com/media/HLoZIwubQAA90tM.jpg>)\n\nThat does not mean every HyperEVM application needs to be exotic. Ecosystems need familiar primitives before they can support complex ones. Users need to swap, borrow, lend, hedge, lever, rebalance, and exit. The local financial surface keeps capital inside the system and makes HyperEVM usable.\n\nBut it also means the deeper opportunity lies somewhere other than forked lending with a new frontend. It is credit, asset management, payments, and structured finance built around an exchange ledger that smart contracts can read from and write to. That is the part no generic EVM can copy by simply attracting liquidity incentives.\n\nCoreWriter also does not make HyperEVM a synchronous extension of the orderbook. Cross environment actions involve sequencing constraints, delayed writes, and reconciliation between smart contract state and HyperCore actions. Builders have to manage failed actions, delayed execution, collateral accounting, and risk across two execution environments. This narrows the design space, but it also creates the wedge.\n\n## 2. The 2x2 Matrix\n\nThe HyperEVM economy is better understood through a two by two. One axis asks whether an application needs general purpose EVM logic, the other asks whether it directly composes with HyperCore state or execution.\n\nThis is more useful than sorting protocols by product label. A lending market, options venue, vault, or staking product can land in different places depending on how it is built. The category name is less important than the dependency the product cannot remove.\n\n![Article Image](<https://pbs.twimg.com/media/HLoZLa5aAAAX2vA.jpg>)\n\n## 2.1 Local EVM Finance\n\nLocal EVM finance needs smart contracts, but the product patterns are mostly portable. AMMs, money markets, CDPs, routers, options venues, leverage products, and yield markets sit here. Felix is one of the recognizable examples. HyperLend also begins here as one of the main credit venues on HyperEVM, though parts of its roadmap point toward programmable HyperCore.\n\nThis quadrant is easy to underrate because the designs are familiar, but that would be wrong. Every financial center needs banks, brokers, liquidity venues, and risk transfer markets before more complex balance sheet products can scale. Portability make these applications the base layer of user activity.\n\n## 2.2 Core Native Extensions\n\nCore native extensions depend more directly on Hyperliquid, but the EVM role is usually to wrap, tokenize, or compose a native primitive. Kinetiq, StakedHYPE, Kintsu, HLP wrappers, Unit linked assets, and similar products sit here. Their job is to make assets inside Hyperliquid more useful.\n\nThis quadrant is important because collateral is the raw material for everything else. Money markets need assets users want to borrow against. Structured products need assets that can be pledged or hedged. Financial accounts need balances that can move across functions instead of remaining trapped in isolated venues.\n\n## 2.3 Programmable HyperCore\n\nProgrammable HyperCore is where applications need EVM logic and also depend on HyperCore state or execution. This is where exchange activity starts becoming productized. Rysk points in this direction by turning options into volatility income on assets users already own. Liminal points in this direction by packaging Hyperliquid based strategies into tokenized products. Hyperbeat points in this direction through delta neutral exposures that combine Core positions with ERC20 composability.\n\nDerive sits adjacent to this map rather than inside the native programmable HyperCore bucket. Its HyperEVM bridge vault makes HYPE and kHYPE useful as collateral for options and perps, but the core trading, margin, and settlement logic live on Derive’s own stack. It can still help Hyperliquid by expanding the use of HYPE collateral. It should not be confused with native programmable HyperCore.\n\nThe stricter version of programmable HyperCore is still early. Several teams are experimenting in this direction, but product direction should not be confused with verified architecture. The standard should be whether contracts custody assets, read HyperCore state, and use CoreWriter as part of the execution path.\n\nValantis Prime is a notable public beta example of this direction. It uses a HyperEVM smart account as a control layer for HyperCore actions through CoreWriter, with permissions, agents, session keys, guardians, and action level constraints around activity that ultimately touches HyperCore. That makes the account itself a programmable interface to the exchange.\n\nHyperLend and Rysk point toward the same frontier from different angles. HyperLend points from credit through L1 spot borrowing, liquid HLP, and unified account design. Rysk points from volatility through onchain income products and liquidity reinforcement around Hyperliquid perps. Both are meaningful experiments, but the standard should remain strict.\n\n## 3. Financial Accounts as the End State\n\nThe most valuable HyperEVM applications may not feel like applications at all. They may feel like accounts.\n\nToday, crypto users still manage financial activity across separate surfaces. One balance sits on an exchange for trading. Another sits in a wallet for DeFi. Vault shares represent yield. Borrowing capacity lives inside a money market. Hedging requires a separate venue. Payments, if they exist at all, are another layer on top. The fragmentation is not only a UX problem. It reflects the fact that liquidity, collateral, execution, and risk usually live in different systems.\n\nHyperEVM has a chance to compress those systems into the account itself. A user should be able to deposit BTC, ETH, SOL, HYPE, or another asset once. From that same balance, the user can trade on HyperCore, borrow on HyperEVM, earn through a vault, hedge through a perp, and fund spending from a payment account. The product is not the bridge between these functions. The product is the balance that can move across them.\n\nCentralized exchanges already understand this better than most crypto applications. Their accounts feel unified because trading, margin, lending, and yield sit inside one controlled environment. The problem is that the ledger is closed, the risk engine is opaque, and outside developers cannot freely build against the account. General purpose chains have the inverse problem. Users control the account, but the financial stack around it is fragmented. Liquidity, execution, credit, yield, and distribution are open, but rarely unified.\n\nHyperliquid can occupy the sweet spot. HyperCore provides exchange grade liquidity and risk infrastructure. HyperEVM provides the open application surface around it. The result is a user controlled financial account backed by HyperCore as the balance sheet, and ultimately the strongest version of the “House of All Finance” vision.\n\nThe proof should show up at the account layer. Collateral follows the user across trading, borrowing, saving, hedging, and spending. Risk is priced from live HyperCore state. Liquidations route through HyperCore depth. Structured products hedge through Core liquidity. ERC20s represent claims on lending, vault, or portfolio margin activity inside the system.\n\nThe first wave of HyperEVM makes the ecosystem usable. The next wave makes HyperCore programmable.\n\nDisclaimer:\n\nThe author of this report may have personal holdings or financial interests in assets or tokens discussed herein. However, the author affirms that no transactions have conducted using material non-public information obtained in the course of research or drafting. This report is intended solely for general information purposes and does not constitute legal, business, investment, or tax advice. It should not be used as a basis for making any investment decisions or as guidance for accounting, legal, or tax matters. Any references to specific assets or securities are made for informational purposes only and should not be construed as an offer, solicitation, or recommendation to invest. The opinions expressed herein are those of the author and may not reflect the views of any affiliated institutions, organizations, or individuals. The opinions and analyses expressed herein are subject to change without prior notice. In addition, beyond the individual disclosures included in each report, Four Pillars, may hold existing or prospective investments in some of the assets or protocols discussed herein. Furthermore, FP Validated, a division of Four Pillars, may already be operating as a node in certain networks or protocols discussed herein or may do so in the future. Please see [here](<https://validated.4pillars.io/protocols>) for FP Validated’s participating network disclosures and [here](<https://research.4pillars.io/en/policy/transparency>) for broader disclosure details.\n\n![Image](https://pbs.twimg.com/media/HLoai5xacAAxk75.jpg)\n![Image](https://pbs.twimg.com/media/HLoZIwubQAA90tM.jpg)\n![Image](https://pbs.twimg.com/media/HLoZLa5aAAAX2vA.jpg)\n\n"
}
