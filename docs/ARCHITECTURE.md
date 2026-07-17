# Architecture

## Purpose

The Content Intelligence System is a local-first ingestion and Obsidian vault layer for future Hermes Agent orchestration. It preserves raw evidence, creates lightweight projections, and avoids external API assumptions in V1.

## Raw Inbox Design

`00_Inbox` is raw-only.

Raw source files are the source of truth. The ingestion pipeline may create raw Markdown source files for mock or adapter-provided items, or preserve existing raw files from manual and Web Clipper drops.

Active raw folders:

```text
00_Inbox/X_Bookmarks
00_Inbox/X_Watchlist
00_Inbox/OpenNews
00_Inbox/Daily_News
00_Inbox/Web_Clipper
00_Inbox/Web_Clipper/_Raw_Drops
00_Inbox/Manual_MD
00_Inbox/Manual_MD/_Raw_Drops
00_Inbox/Web_Articles
```

Generated normalized notes should not be written into `00_Inbox`. Visible generated outputs belong in topic pages, entity pages, timelines, Discord queue files, daily briefs, or future synthesis/research folders.

## `.system` Indexes

The `.system` folder is hidden machine-readable state for orchestration and dedupe.

Current files:

```text
.system/ingest-log.jsonl
.system/dedupe-index.json
.system/source-index.json
.system/routing-index.json
```

Responsibilities:

- `ingest-log.jsonl`: append-only event log for ingested, duplicate, and error events.
- `dedupe-index.json`: maps dedupe keys to canonical source records.
- `source-index.json`: stores canonical source records and source bundles.
- `routing-index.json`: stores topic/entity/routing decisions and projection targets.

The `.system` files are allowed to be generated and rewritten because they are indexes. Raw files should not be deleted or rewritten by the pipeline.

## Source Bundle Concept

A source bundle connects related pieces of evidence.

Example:

```text
X post = discovery source
linked article = main source content
bundle = relationship between both records
```

The bundle is recorded in `.system/source-index.json`.

Current `SourceItem` bundle fields:

```text
bundle_id
linked_urls
parent_url
role
```

Typical roles:

```text
discovery
main_source
```

This allows Hermes to understand that a social post may be important because it points to a larger primary source.

## Topic Projections

Topic pages live in `10_Topics`.

Current initial topics:

```text
Hyperliquid
AI_Agents
Tokenized_Stocks
Stablecoins_RWA
Wallets
Crypto_Market_Structure
```

Topic page structure:

```text
# Topic Name

## Current Understanding
## Latest Signals
## Active Narratives
## Key Entities
## Open Questions
## Source Backlinks
```

Topic pages should change slowly and should link back to raw source files. They are the first place Hermes or future RAG should read for context.

## Entity Projections

Entity pages live in `20_Entities`.

Entity types:

```text
People
Protocols
Companies
Chains
Tokens
```

Entity page structure:

```text
# Entity Name

## What It Is
## Related Topics
## Latest Mentions
## Important Links
## Source Backlinks
```

Entity pages should be created only when the system has clear entity evidence.

## Timeline Projections

Timeline files live in `30_Timelines`.

Timeline format:

```text
# Hyperliquid Timeline

* YYYY-MM-DD - Event summary. Sources: [[raw-source-link]]
```

Timelines provide chronological memory and should remain concise.

## Discord Queue Design

Discord queue files live in `60_Discord_Queues`.

They are drafts for Hermes, not sent Discord messages.

Queue file examples:

```text
60_Discord_Queues/hyperliquid.md
60_Discord_Queues/ai-agent.md
60_Discord_Queues/tokenized-stocks.md
60_Discord_Queues/stablecoins-rwa.md
60_Discord_Queues/wallet-strategy.md
```

Queue item format:

```text
## YYYY-MM-DD - Title

Status: pending
Priority: low/medium/high
Topic: Hyperliquid
Suggested Discord Channel: hyperliquid
Sources:

* [[raw source 1]]

Suggested Message:
...

Why It Matters:
...
```

Only medium/high priority items should create Discord queue entries in V1.

## Daily Briefs

Daily briefs are written to:

```text
40_Synthesis/YYYY-MM-DD-daily-brief.md
```

The current generator reads from:

```text
.system/source-index.json
.system/routing-index.json
10_Topics
30_Timelines
60_Discord_Queues
```

The brief is rule-based and should remain draft status until a human or Hermes reviews it.

## Future Hermes And GBrain Integration

Future Hermes responsibilities:

- Call ingestion commands.
- Coordinate MCP source adapters.
- Generate daily briefs.
- Review Discord queue drafts.
- Draft content ideas from selected notes.
- Promote stable facts into topic/entity pages when appropriate.

Future GBrain/RAG flow:

```text
question
-> retrieve topic pages for map/context
-> follow backlinks to raw evidence
-> use entity pages and timelines for supporting context
-> answer with citations to raw source files
```

GBrain, embeddings, and real RAG should stay deferred until ingestion, dedupe, and projection behavior are stable.
