---
description: Compile uncompiled raw evidence in 00_Inbox into wiki pages (source-summaries, topics, entities) with sources[] + confidence.
---

# /compile — the agent side of the compile seam

You are the compiler for the Content Intelligence Vault (DECISION #9: the vault is the LLM-wiki, Claude Code is the compiler). This command runs the **agent clock** (#10): a scheduled, token-budgeted pass over raw evidence that node has already ingested.

Argument (optional): `$ARGUMENTS` may narrow the pass — a topic name (`Hyperliquid`), a raw path, or a count (`5`). With no argument, compile the highest-priority uncompiled raw, default budget **5 sources**.

Vault root: `vault/Content_Intelligence_Vault`.

## What you own vs what node owns (#17)

You write **only** these, and node never touches them:

- `05_Sources/` — one source-summary per raw doc
- `10_Topics/` — topic pages
- `20_Entities/` — entity pages
- `40_Synthesis/`, `50_Research_Answers/` — synthesis and answers

Node owns and you must **never hand-edit**: `00_Inbox/` (raw evidence), `30_Timelines/`, `60_Discord_Queues/`, `index.md`, `log.md`, `.system/`. You *append* to `log.md` only through the documented log line format below — never rewrite it.

There is no skeleton-then-enrich. If a page is yours, you write the whole file.

## Step 1 — Analyze (do not write yet)

1. Read `index.md` first. It is the cheap catalog: `| path | summary | tags |`. Use it to find what already exists so you enrich rather than duplicate.
2. List candidate raw files under `00_Inbox/**` that have **no** corresponding page in `05_Sources/` (check `sources[]` in existing summaries, not filenames).
3. Rank candidates by **compile priority** (#10 amendment):

   ```
   priority = content-potential x source-trust x recency
   ```

   Relevance is **not** in this formula and is **not** a gate. Human intent (a saved/promoted item) is the relevance signal; anything sitting in `00_Inbox` already passed it. `.system/routing-index.json` carries node's ingest scores — read them as hints, never as permission.
4. Take the top N (budget). For each, read the raw fully and note: claims, figures, entities mentioned, links to existing pages, and **contradictions** against what the wiki already says.
5. Report the plan to the user in prose — which sources, in what order, what you expect to create vs update — before writing.

## Step 2 — Generate

For each selected raw, in priority order:

### 2a. Source-summary → `05_Sources/`

One page per raw doc. Depth is **adaptive** (#14):

- A tweet or short post: 1–3 lines.
- A dense research report: a structured extract — thesis, key data/numbers, methodology, caveats, figure callouts — and verbatim "key extracts" for figures you'd otherwise paraphrase into inaccuracy.

Never copy the raw wholesale; a summary that is as long as its source has saved nothing.

### 2b. Entities → `20_Entities/` (auto, thresholded — #19)

Create an entity page automatically when it clears the bar: **≥2 sources mention it, OR one high-confidence source is explicitly about it.** No approval needed. Below the bar, mention the name inline on a page; do not give it a file. Place it under the correct subfolder: `People/`, `Protocols/`, `Companies/`, `Chains/`, `Tokens/`.

### 2c. Topics → `10_Topics/` (gated — #19)

Work **within the existing topic list**. You may freely update an existing topic page.

You may **not** create a new topic folder. When you detect a recurring, multi-source, high-priority theme that fits no existing topic:

1. Append a proposal line to `log.md` (format below).
2. Tell the user in your summary that a topic proposal is pending.
3. Attach the content to the **nearest existing topic** (or `Crypto_Market_Structure` as catch-all) meanwhile.

**Capture is never blocked on approval.** The raw stays, the source-summary is written, entities are created — only the grouping waits. An entity that earns sustained multi-source coverage may **graduate**: propose it as a topic through the same path.

### 2d. Frontmatter contract (#20) — exactly these six fields, no more

```yaml
---
type: source-summary       # topic | entity | source-summary | synthesis | answer
sources: [00_Inbox/Web_Clipper/_Raw_Drops/2026-07-02-hip-4.md]
confidence: high           # high | medium | low
published: 2026-07-02      # when the EVIDENCE was published
updated: 2026-07-17        # when THIS PAGE was last compiled (today)
tags: [hyperliquid]
---
```

Hard rules, enforced by `npm run lint:wiki`:

- Every path in `sources[]` starts with `00_Inbox/` and **resolves to a file that exists**. A `sources[]` entry you cannot open is a fabricated citation — worse than no page.
- `relevance` / `relevance_score` must **never** appear on a page. Those live in `.system` only.
- `explored` is deferred — do not add it.
- `type` must match the folder (`05_Sources` → `source-summary`, `10_Topics` → `topic`, `20_Entities` → `entity`).
- No field beyond the six. A field nothing reads is token overhead on every page.

Set `confidence` honestly: `high` = the source is explicit and you are restating it; `medium` = you inferred or merged across sources; `low` = thin, single-source, or contradicted. `confidence` is load-bearing — it is what triggers escalation-to-raw at read time.

### 2e. Update `index.md`

Append or update one row per page you wrote: `| path | summary | tags |`. Match on path — update the existing row rather than appending a duplicate.

### 2f. Append to `log.md`

```
- 2026-07-17T09:00:00Z — compile: 05_Sources/hip-4-analysis.md ← 00_Inbox/Web_Clipper/_Raw_Drops/2026-07-02-hip-4.md (confidence: high)
- 2026-07-17T09:00:00Z — propose-topic: Perp_DEX_Regulation (4 sources) — pending human approval
- 2026-07-17T09:00:00Z — contradiction: 10_Topics/Hyperliquid/index.md says X, 00_Inbox/.../y.md says Y
```

## Step 3 — Verify

Run `npm run lint:wiki`. **A compile pass is not done until lint is clean.** Lint is the contract seam: it cannot judge your prose, but it proves the structure and the citations hold. Fix violations, do not suppress them.

Then report to the user: pages created, pages updated, topic proposals pending, contradictions found, and anything you set to `low` confidence.

## Escalation-to-raw (#14) — applies at read time, not just compile

When answering any query from this vault:

Read `index.md` → read the relevant `05_Sources` summaries → **open the raw via `sources[]`** if any of these hold:

- the query needs **specific figures or numbers**
- the query needs a **verbatim claim or quote**
- the query needs **methodology** or how a result was derived
- the summary's `confidence` is **low**
- the summaries **contradict** each other

Summaries are the token saver for the common case. They are not a cap on accuracy — when accuracy is on the line, the raw is the source of truth (#5). Do not answer from a summary alone in those cases, and do not silently degrade: if you could not open a cited raw, say so.

## Constraints (from CLAUDE.md — non-negotiable)

- Never write into `00_Inbox`, never delete or move raw files.
- Only write inside the project directory and the vault root; path traversal is rejected.
- Zero npm dependencies.
- No network calls, no MCP, no embeddings — compile is you reading files.
