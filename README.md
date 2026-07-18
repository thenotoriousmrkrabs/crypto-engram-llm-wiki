# Content Intelligence System

Local-first source ingestion scaffold for a future Hermes Agent operated crypto and AI intelligence vault.

The vault is an **LLM-Wiki** (DECISION #9). Node ingests raw evidence and writes only mechanical artifacts; an agent compiles the wiki pages, each citing `sources[]` with a `confidence`. Node writes no page into an agent-owned root (#17/#22). It does not publish content, trade, move funds, or run browser automation.

The **firehose** (#25, issue #3) is the one real network surface: a scheduled pull from the 6551 opennews API into a cold store outside the vault, posted to a Discord channel by a tap-to-save bot. Only items the human promotes (💾) cross into `00_Inbox` (#12).

Design decisions live in `docs/DECISIONS.md` (#1–#25) and are authoritative over this file.

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
npm run ingest:opennews
npm run bot:start
npm run lint:wiki
npm run test
```

`ingest:opennews` and `bot:start` read `OPENNEWS_TOKEN` (and the bot also
`DISCORD_BOT_TOKEN` + `DISCORD_CHANNEL_ID`) from `.env` — copy `.env.example`
and fill in real values; `.env` is gitignored and never committed.

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

## The Firehose (opennews, #25)

```text
timer (in the bot) -> pull 6551 /open/news_search -> cold store firehose/opennews/
   -> post new items to the Discord channel -> human taps 💾 on a message
   -> promote that one item -> 00_Inbox/OpenNews -> /compile (unchanged)
```

- The cold store lives **outside** the vault (`firehose/`, gitignored): stored, never indexed, never retrieved (#13). Its id set is the pull dedupe.
- Arrival is **scheduled pull** (default every 20 min), not a live WebSocket — deliberate (#25 addendum): delivery is token-free plumbing either way, clumped arrivals nudge batched compiles, and a failed tick just catches up next tick.
- Each Discord message embeds a `` `opennews:<id>` `` marker; the 💾 reaction resolves it back to the cold-store item and promotes exactly that item. Promote is the **only** firehose → wiki crossing (#12).
- The bot needs the **Message Content intent** enabled in the Discord developer portal, and `discord.js` is the project's sole approved dependency (recorded in CLAUDE.md).

Source status: `opennews` = **real** (REST pull). `opentwitter` = pull adapter planned on the same pattern; live watch-push deferred to Hermes. `daily-news` = **dropped** (redundant under the premium token; free fallback only — `docs/sources/6551-mcp-reference.md`). `opentrade` = disabled, read-only later at most.

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
- Live WebSocket push (per-channel upgrade only if a trading-latency source appears, #25)
- The raw + signal two-channel split (single channel first; aiRating is preserved in raw, so score-gating needs no rework)

## Safety

The writer resolves all paths against the configured vault root, blocks path traversal, and writes only inside `/Users/angjingkang/content-intelligence-system/vault/Content_Intelligence_Vault` at runtime. Production code does not delete raw source files.
