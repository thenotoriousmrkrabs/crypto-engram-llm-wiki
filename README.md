# Content Intelligence System

Local-first source ingestion scaffold for a future Hermes Agent operated crypto and AI intelligence vault.

V1 focuses only on source ingestion, raw evidence preservation, dedupe, rule-based classification, LLM-wiki projections, and daily brief generation. It does not publish content, trade, move funds, run browser automation, call paid APIs, or perform real MCP/API integration.

## Architecture

- Codex builds and maintains this local scaffold.
- Hermes will later orchestrate ingestion and brief generation.
- Obsidian is the storage and review layer.
- MCP tools will later act as external source adapters.
- The human user remains the final reviewer and approver.

The runtime flow is:

```text
source adapter -> raw source -> SourceItem -> dedupe -> classify -> topic/entity/timeline/queue projections -> system indexes -> daily brief
```

Design rule:

```text
00_Inbox/ = raw evidence only
10_Topics/ = evolving understanding
20_Entities/ = people, protocols, companies, chains, tokens
30_Timelines/ = chronological memory
60_Discord_Queues/ = notification drafts for Hermes
.system/ = dedupe, source, routing, and ingest state
```

## Setup

```sh
cd /Users/angjingkang/content-intelligence-system
npm run setup-vault
```

Open the vault in Obsidian:

```sh
open -a Obsidian "/Users/angjingkang/content-intelligence-system/vault/Content_Intelligence_Vault"
```

If Obsidian does not open it as a vault automatically, choose "Open folder as vault" and select:

```text
/Users/angjingkang/content-intelligence-system/vault/Content_Intelligence_Vault
```

## Commands

```sh
npm run setup-vault
npm run ingest:mock
npm run ingest:manual
npm run ingest:web-clipper
npm run brief:daily
npm run test
```

Manual Markdown raw drops go in:

```text
vault/Content_Intelligence_Vault/00_Inbox/Manual_MD/_Raw_Drops
```

Web Clipper Markdown raw drops go in:

```text
vault/Content_Intelligence_Vault/00_Inbox/Web_Clipper/_Raw_Drops
```

Raw drops are never deleted or moved by V1. Processed knowledge is written to topic pages, entity pages, timelines, Discord queue files, and `.system` indexes. The pipeline no longer creates normalized notes inside `00_Inbox`.

## Mock Ingestion

Run:

```sh
npm run ingest:mock
```

This creates raw source files and wiki projections for:

- X post about HyperliquidR sharing The Almanack of Hyperliquid
- Linked article: `https://www.hyperliquidr.xyz/post/the-almanack-of-hyperliquid`
- X bookmark about Hyperliquid HIP-4
- News item about tokenized stocks
- AI agent news item
- Stablecoin/RWA item
- Wallet strategy item

Running mock ingestion again should skip duplicates using `.system/dedupe-index.json`.

## Daily Brief

Run:

```sh
npm run brief:daily
```

The generated brief is written to:

```text
vault/Content_Intelligence_Vault/40_Synthesis/YYYY-MM-DD-daily-brief.md
```

V1 reads from `.system` indexes, `10_Topics`, `30_Timelines`, and `60_Discord_Queues`. Hermes/LLM summarization can improve this later.

## Future Hermes Integration Plan

Hermes will later call local commands or equivalent module functions to:

- ingest x-bookmarks
- ingest opennews
- ingest opentwitter
- ingest daily-news
- generate daily brief
- draft content idea from selected note

Hermes should remain the orchestrator/operator. This project stays as the local ingestion and vault-writing substrate.

## Future MCP Integration Plan

- `opennews-mcp` = structured crypto/news feed
- `opentwitter-mcp` = X/KOL/topic monitoring
- `daily-news` = lightweight digest
- `opentrade` = disabled initially; only read-only market/token data later
- xAI/Grok OAuth X Search = optional ad hoc X search

## Intentionally Not Built Yet

- Auto-posting
- Instagram, TikTok, or X publishing
- Trading
- Swaps
- Wallet signing
- Token transfers
- Browser automation
- Deleting notes
- Rewriting the full vault
- Embeddings or full RAG
- Paid API assumptions
- Real external MCP/API calls

## Safety

The writer resolves all paths against the configured vault root, blocks path traversal, and writes only inside `/Users/angjingkang/content-intelligence-system/vault/Content_Intelligence_Vault` at runtime. Production code does not delete raw source files.
