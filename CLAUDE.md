# Claude Code Project Context

## Project Goal

Build the first version of a local-first Content Intelligence System for crypto and AI research.

The vault is an **LLM-wiki** (DECISION #9): raw evidence is compiled by an agent into a persistent, cross-linked, compounding knowledge layer. It is the storage and ingestion substrate that Hermes Agent can later orchestrate. Node ingests raw source material, preserves evidence in an Obsidian vault, dedupes it, classifies it with simple rules, and projects **mechanical** artifacts (timelines, Discord queue drafts, `index.md`/`log.md`, `.system` state). An agent compiles the **judgment** artifacts (source-summaries, topic pages, entity pages, synthesis, answers).

Overriding goal: retrieval fetches the **most accurate answer for the fewest tokens** — accuracy, relevancy, cost-efficiency.

This version is not a content autoposter, trading bot, browser automation system, or full RAG system.

Design decisions are recorded in `docs/DECISIONS.md` (#1–#21) and are authoritative over this file where they conflict.

## Current Architecture

Project path:

```text
/Users/angjingkang/content-intelligence-system
```

Two clocks (#10): node ingest runs continuously and is free; agent compile is scheduled and costs tokens.

Node clock — `npm run ingest:*`:

```text
source adapter
-> raw source item
-> SourceItem normalization
-> raw source preservation in 00_Inbox
-> multi-key dedupe
-> rule-based classification (scores stay in .system, never on a page)
-> source and routing index updates
-> mechanical projections: timelines, Discord queue drafts
-> index.md rows + log.md line
```

Agent clock — `/compile`:

```text
read index.md
-> pick uncompiled raw by priority = content-potential x source-trust x recency
-> analyze (entities, links, contradictions)
-> generate source-summaries / topic pages / entity pages with sources[] + confidence
-> update index.md + log.md
-> npm run lint:wiki must be clean
```

The seam (#17): **node and agent own different files.** No skeleton-then-enrich.

```text
00_Inbox/          node   raw evidence only, source of truth, never edited or deleted
30_Timelines/      node   chronological memory
60_Discord_Queues/ node   Hermes notification drafts, not sent messages
index.md, log.md   node   catalog + append-only ops log (agent appends log lines only)
.system/           node   ingest, dedupe, source, routing state (and ingest scores)

05_Sources/        agent  one source-summary per raw doc, adaptive depth
10_Topics/         agent  living topic understanding (new topics are human-gated)
20_Entities/       agent  people, protocols, companies, chains, tokens (auto, thresholded)
40_Synthesis/      agent  briefs and future synthesis
50_Research_Answers/ agent  compiled answers
```

Retrieval reads the **compiled + indexed layer only** (#11). Uncompiled raw is stored but not indexed, so it cannot dilute accuracy — it is reached only by escalation through `sources[]`.

## Vault Structure

Active vault root:

```text
vault/Content_Intelligence_Vault
```

Active folders (post-#18):

```text
index.md                  <- retrieval entry point: | path | summary | tags |
log.md                    <- append-only: ingests, compiles, proposals, contradictions
00_Inbox/
  X_Bookmarks/
  X_Watchlist/
  OpenNews/
  Daily_News/
  Web_Clipper/
    _Raw_Drops/
  Manual_MD/
    _Raw_Drops/
  Web_Articles/
05_Sources/
10_Topics/
  Hyperliquid/
  AI_Agents/
  Tokenized_Stocks/
  Stablecoins_RWA/
  Wallets/
  Crypto_Market_Structure/
20_Entities/
  People/
  Protocols/
  Companies/
  Chains/
  Tokens/
30_Timelines/
40_Synthesis/
50_Research_Answers/
60_Discord_Queues/
80_Templates/
90_Archive/
.system/
  ingest-log.jsonl
  dedupe-index.json
  source-index.json
  routing-index.json
```

The firehose cold store lives **outside** the vault (`firehose/`, gitignored) so it is stored but never indexed (#12).

Legacy scaffolding from the first version was archived under:

```text
90_Archive/Legacy_Normalized_Inbox/
90_Archive/Legacy_Scaffold/
90_Archive/Legacy_V1_Folders/     <- .ingestion, 10_Daily_Briefs, 40_Narrative_Briefs,
                                     50_Content_Drafts, 60_Prompt_Rules, 70_Performance
```

## Compile Rules

Run with `/compile` (see `.claude/commands/compile.md` for the full procedure). The rules below are binding on any agent writing to this vault, with or without the command.

### Frontmatter contract (#20)

Every agent-compiled page carries **exactly** these six fields:

```yaml
---
type: source-summary       # topic | entity | source-summary | synthesis | answer
sources: [00_Inbox/Web_Clipper/_Raw_Drops/2026-07-02-hip-4.md]
confidence: high           # high | medium | low
published: 2026-07-02      # when the EVIDENCE was published
updated: 2026-07-17        # when THIS PAGE was last compiled
tags: [hyperliquid]
---
```

- A field is added only when something actually **reads** it today.
- `relevance` / `relevance_score` must never appear on a page — relevance is judged fresh per query; a stored score is ignored or stale. Ingest scores stay in `.system` (#10 amendment).
- `explored` is deferred until a consumer (an `/autoresearch` loop or dashboard) exists.
- Every `sources[]` path starts with `00_Inbox/` and must resolve to an existing file.
- Raw evidence files are **not** covered by this schema — they carry node-written raw frontmatter.

`npm run lint:wiki` enforces this contract. It cannot judge prose; it proves structure and citations. A compile pass is not done until lint is clean.

### Compile priority (#10 amendment)

```
priority = content-potential x source-trust x recency
```

Relevance is **not** a compile gate. Human intent (saving/promoting an item) is the relevance signal; anything in `00_Inbox` already passed it. Relevance survives only as a Discord digest **sort** hint (#21) — sort, not gate.

### Growth policy (#19)

- **Topics are gated.** The agent works within the existing `10_Topics/` list and never creates a topic folder. A recurring, multi-source, high-priority theme with no home is **proposed** to `log.md` (plus a Discord nudge) for human approval.
- **Capture is never blocked on approval.** Raw is captured, the source-summary is written, entities are created; the item attaches to the nearest existing topic (catch-all: `Crypto_Market_Structure`) until approval. Approval controls grouping only, never whether knowledge is kept.
- **Entities are auto-created, thresholded:** ≥2 sources mention it, OR one high-confidence source is explicitly about it. No approval. Below the bar, mention it inline without a file.
- **Entities can graduate to topics** via the same proposal path.

### Escalation-to-raw (#14)

Answer from `index.md` → `05_Sources` summaries. **Open the raw via `sources[]`** whenever the query needs specific figures, a verbatim claim, or methodology; whenever the summary's `confidence` is `low`; or whenever summaries contradict each other. Summaries minimize tokens for the common case; they never cap accuracy. Raw is the source of truth (#5).

## Current Implementation Status

Implemented:

- Node.js ESM project with zero npm dependencies.
- Obsidian vault scaffold and template creation.
- Source adapter stubs for X bookmarks, OpenTwitter MCP, OpenNews MCP, Daily News MCP, Web Clipper folder, Manual Markdown folder, and OpenTrade market-readonly.
- `SourceItem` normalization.
- Rule-based classification and relevance/content-potential scoring.
- Raw-only `00_Inbox` ingestion.
- Manual Markdown raw-drop ingestion.
- Web Clipper raw-drop ingestion.
- Mock ingestion with X, article, news, stablecoin/RWA, AI agent, and wallet examples.
- Dedupe by URL, source ID, cleaned content hash, and title/author/date hash.
- Source bundle support for a discovery source plus linked child source.
- Mechanical projections only: timelines, Discord queue drafts, `index.md`, `log.md`, and `.system` indexes. Node no longer writes topic or entity pages (the #17 seam).
- Daily brief generation into `40_Synthesis/YYYY-MM-DD-daily-brief.md`.
- `lintWiki` frontmatter/citation contract validator (`npm run lint:wiki`).
- `/compile` command definition (`.claude/commands/compile.md`).
- Tests for vault creation, dedupe, raw preservation, note writing safety, raw drops, source bundles, projections, lint contract, and path traversal rejection.

Not yet done:

- No source-summary pages compiled yet — `05_Sources/` exists but is empty until the first `/compile` run.
- Firehose cold-store wiring, Discord promote-on-save and the two channels (#12/#13/#21), MCP adapters (#7), GBrain/RAG (#6) are all deferred.

Important implementation files:

```text
src/main/ingestion/pipeline.js
src/main/ingestion/classifier.js
src/main/obsidian/writer.js
src/main/obsidian/wiki.js
src/main/obsidian/lint.js
src/main/brief/daily-brief.js
src/main/adapters/
tests/vault.test.js
tests/lint.test.js
docs/DECISIONS.md
.claude/commands/compile.md
```

## Important Commands

```sh
npm run setup-vault
npm run ingest:mock
npm run ingest:manual
npm run ingest:web-clipper
npm run brief:daily
npm run lint:wiki
npm run test
```

Open the vault in Obsidian:

```sh
open -a Obsidian "/Users/angjingkang/content-intelligence-system/vault/Content_Intelligence_Vault"
```

If needed, manually select "Open folder as vault" in Obsidian and choose:

```text
/Users/angjingkang/content-intelligence-system/vault/Content_Intelligence_Vault
```

## Agent skills

### Issue tracker

Issues live as GitHub issues on `thenotoriousmrkrabs/content-intelligence-system`, via the `gh` CLI. External PRs are **not** a triage surface. See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical roles map to themselves (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context. Glossary in `CONTEXT.md`; **ADRs are consolidated in `docs/DECISIONS.md` (#1–#21), not `docs/adr/`**. See `docs/agents/domain.md`.

## Safety Constraints

- Keep zero external npm dependencies unless the user explicitly approves a dependency change.
- Only write inside the project directory and configured vault root.
- Do not delete raw source files.
- Do not move raw source files unless explicitly requested.
- Do not write generated normalized notes into `00_Inbox`.
- Preserve raw drops under `00_Inbox/Manual_MD/_Raw_Drops` and `00_Inbox/Web_Clipper/_Raw_Drops`.
- Keep OpenTrade disabled and read-only only.
- Path traversal must remain rejected.
- No destructive filesystem operations without explicit user approval.

## What Not To Build Yet

- Auto-posting.
- Instagram, TikTok, or X publishing.
- Trading, swaps, leverage, order placement, or wallet actions.
- Wallet signing or token transfers.
- Browser automation.
- Real MCP/API calls.
- Paid API assumptions.
- Discord API sending.
- GBrain/RAG/embeddings.
- Full content production pipelines.

## Current Open Questions

Resolved: legacy folder disposition (archived — #18) and entity auto-creation (thresholded, no approval — #19).

Still open:

- Should Web Clipper be configured to save directly into `00_Inbox/Web_Clipper/_Raw_Drops/Clippings`, or should a sync script mirror an external `Clippings` folder into the vault?
- How strict should topic routing become before adding embeddings or LLM-assisted classification?
- What is the preferred Hermes CLI interface: npm scripts, a single `hermes-ingest` command, or direct module calls?
- Tuning the #19 thresholds: N sources before a topic proposal, and whether the entity bar of ≥2 sources holds in practice.
- Compile budget per `/compile` run (default 5 sources) — too conservative or about right?

## Recommended Next Tasks

1. Run the first `/compile` pass and verify `05_Sources/` pages with `npm run lint:wiki`.
2. Archive the stale v1 topic/entity pages still sitting in the real vault (inert — lint skips pages without `type`).
3. `git init` and an initial commit; the project is not yet a git repo.
4. Decide the Web Clipper operating model: save directly inside the vault or copy from an external folder.
5. Add a `npm run doctor` / `vault:health` command to verify vault paths, raw-only inbox rules, and index consistency.
6. Add a CLI wrapper for Hermes-oriented commands, such as `ingest`, `brief`, `queue`, and `status`.
7. Prepare adapter contracts for future MCP integration without adding network calls yet.
