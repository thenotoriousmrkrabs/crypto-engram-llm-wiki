# Content Intelligence System

Local-first source ingestion scaffold for a future Hermes Agent operated crypto and AI intelligence vault.

The vault is an **LLM-Wiki** (DECISION #9). Node ingests raw evidence and writes only mechanical artifacts; an agent compiles the wiki pages, each citing `sources[]` with a `confidence`. Node writes no page into an agent-owned root (#17/#22). It does not publish content, trade, move funds, run browser automation, call paid APIs, or perform real MCP/API integration.

Design decisions live in `docs/DECISIONS.md` (#1–#23) and are authoritative over this file.

## Architecture

- Codex builds and maintains this local scaffold.
- Hermes will later orchestrate ingestion and brief generation.
- Obsidian is the storage and review layer.
- MCP tools will later act as external source adapters.
- The human user remains the final reviewer and approver.

The runtime flow is:

```text
node  (free, continuous):  source adapter -> raw evidence -> SourceItem -> dedupe -> classify -> timeline/queue projections -> system indexes -> index.md + log.md
agent (scheduled, /compile): raw evidence -> analyze -> source-summaries, topics, entities with sources[] + confidence -> lint:wiki
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
npm run lint:wiki
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

## Validate The Compiled-Page Contract

Run:

```sh
npm run lint:wiki
```

Every page in an agent-owned root must carry the six frontmatter fields of #20, and every `sources[]` entry must resolve to a real file under `00_Inbox`. A page with no frontmatter is a violation, never a skip (#23).

Synthesis and daily briefs are agent-compiled via `/compile` (#17) — node does not generate them.

## Future Hermes Integration Plan

Hermes will later call local commands or equivalent module functions to:

- ingest x-bookmarks
- ingest opennews
- ingest opentwitter
- ingest daily-news
- compile raw evidence into wiki pages
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
