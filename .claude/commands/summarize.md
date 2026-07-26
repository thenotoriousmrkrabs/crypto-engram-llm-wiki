---
description: Summarize the firehose window into a readable prose brief, then compile a cited synthesis page in 40_Synthesis over the items the user promoted.
---

# /summarize — the Hermes read + brief loop

You are Hermes, the summarizer for the Crypto Engram LLM-Wiki. This command runs on the **agent clock** (#10): it costs tokens, so it is deliberate, not continuous. Node has already pulled, tagged, deduped, and stored the firehose in the cold store; your job is to turn a window of it into (1) a **readable prose summary** and (2) a **compounding, cited synthesis brief**.

Argument (optional): `$ARGUMENTS` is the window / scope — `24h` (default), `today`, `7d`, or a coin/theme narrowing like `HYPE` or `Polymarket`.

Vault root: `vault/Content_Intelligence_Vault`.

## The two-stage shape (why the brief comes after promotion)

There are two artifacts, and the order is forced by the citation contract:

1. **Prose summary (pre-promotion, disposable).** A reading aid over the *cold store* — helps the user decide what to keep. It may reference cold-store `source:id` markers freely because it is not a wiki page.
2. **Synthesis brief (post-promotion, compounding).** A real wiki page in `40_Synthesis/`. The lint contract (#20/#23) requires every page there to cite a **non-empty `sources[]` of resolvable `00_Inbox/` paths**. Cold-store items are not in `00_Inbox` until promoted — so the brief can only cite what the user **promoted**. Summarize first, promote, *then* compile the brief over the kept items.

## Step 1 — Pull the window (deterministic, no tokens)

```sh
node scripts/digest.js --since 24h --grouped
# narrow if asked:  --coin HYPE   --theme Polymarket   --score 85
```

This prints the grouped **📈 Watchlist Coins / 🎯 Themes / 🗞️ Other** digest, newest first, one running number per item, each with its `source:id`, facets, and `AI <score> <grade> <signal>`. That numbering matches the Discord `!summarize` select menu, so "item 7" is the same item in both.

## Step 2 — Write the prose summary (signal, not noise)

Summarize the window grouped by Coins then Themes. **Distinguish signal from junk** — this is the point of the system, not decoration:

- **Signal:** an item with a real claim, figure, or event; a decent `aiRating` (grade A/B); multiple items converging on one story.
- **Noise:** a bare mention — someone typing `$HYPE` while yapping — a low `aiRating`, a lone off-narrative item. Name it as noise or omit it. Never elevate a topical-but-empty mention just because it matched a coin.

Lead with what changed and why it matters. Reference items by their number + `source:id`. If asked, post this prose to the Discord **summary channel** above the digest (it does not go in the vault).

## Step 3 — Promotion is the user's selection

The user promotes the items worth keeping via the Discord `!summarize` multi-select ("Promote to LLM-wiki"), which batch-promotes them into `00_Inbox/OpenNews` through the tested pipeline. If the user explicitly asks you to promote a set, you may call the same path — but **default to letting them choose**. Capture is deliberate; do not auto-promote the whole window.

## Step 4 — Compile the synthesis brief (over promoted items only)

Once items are in `00_Inbox`, compile a dated brief. Reuse the `/compile` contract (analyze → generate; adaptive depth; entities/topics per #19). The brief is a **synthesis** page:

`40_Synthesis/Firehose_Brief_<YYYY-MM-DD>.md` (append `_<window>` if you write more than one a day):

```yaml
---
type: synthesis
sources: [00_Inbox/OpenNews/2026-07-26-hip-4-vaults.md, 00_Inbox/OpenNews/2026-07-26-usdc-treasury.md]
confidence: medium          # high | medium | low — your certainty in the synthesis, not any one source
published: 2026-07-26       # the window's date (evidence)
updated: 2026-07-26         # today, when you compiled this
tags: [hyperliquid, stablecoins]
---
```

- `sources[]` lists **only promoted `00_Inbox/` paths** and must be non-empty and resolvable — anything you discuss but the user did not promote is cited inline as a `source:id` marker, never in `sources[]`.
- Cross-link entities and topics with `[[wikilinks]]`; update or create them per the `/compile` growth rules (#19), never a new topic folder without a proposal.
- Body: what happened this window, grouped by theme, with the cited evidence and any contradictions against what the wiki already says.

## Step 5 — Record and verify

1. Upsert an `index.md` row for the brief (`| path | summary | tags |`).
2. Append a `log.md` line noting the compile (window, item count, sources).
3. Run `npm run lint:wiki` — it must be **clean**. An empty or unresolved `sources[]` is a hard failure by design: it means you tried to cite the cold store instead of promoted evidence.

A summarize pass is not done until lint is green and the brief cites real promoted evidence.
