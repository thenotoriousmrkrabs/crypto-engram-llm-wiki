# Codex To Claude Code Handoff

## Project

Content Intelligence System

```text
/Users/angjingkang/content-intelligence-system
```

This project is a local-first ingestion and Obsidian vault scaffold for a future Hermes Agent crypto and AI intelligence system.

## What Has Been Implemented

- A Node.js ESM project with no runtime or dev dependencies.
- Obsidian vault scaffold under `vault/Content_Intelligence_Vault`.
- Configuration files in `config/` for sources, topics, watchlists, and vault path.
- Markdown templates in `80_Templates`.
- Source adapter stubs for:
  - X bookmarks
  - OpenTwitter MCP
  - OpenNews MCP
  - Daily News MCP
  - Web Clipper folder
  - Manual Markdown folder
  - OpenTrade market-readonly
- A normalized `SourceItem` shape.
- Rule-based ingestion pipeline.
- Multi-key dedupe.
- Raw-only inbox behavior.
- Topic, entity, timeline, Discord queue, source index, routing index, and daily brief projections.
- Mock ingestion data covering Hyperliquid, tokenized stocks, AI agents, stablecoins/RWA, and wallets.
- Tests for the current core behavior.

## What Changed Recently

The first scaffold created normalized notes inside `00_Inbox`. That was rejected because `00_Inbox` should act as raw evidence storage, not a place for generated analysis.

The ingestion pipeline was refactored so that:

- Raw files are saved or preserved in `00_Inbox`.
- Generated normalized inbox notes are no longer created.
- Existing normalized inbox notes were moved into `90_Archive/Legacy_Normalized_Inbox`.
- Empty legacy folder scaffolds `20_Topics` and `30_Entities` were moved into `90_Archive/Legacy_Scaffold`.
- Active topic pages now live under `10_Topics`.
- Active entity pages now live under `20_Entities`.
- Daily briefs now live under `40_Synthesis`.
- `.system` now owns ingest, dedupe, source, and routing state.

## Why Normalized Inbox Notes Were Rejected

The old normalized notes duplicated source content and made it unclear which file was the source of truth. Manual Markdown drops and Web Clipper notes already preserve the original source text. Adding a second generated note in `00_Inbox` created confusion, especially when filenames and body content looked similar.

The accepted model is:

```text
raw source in 00_Inbox = source of truth
topic/entity/timeline/queue pages = projections from raw evidence
.system indexes = hidden machine-readable state
```

Generated visible analysis belongs outside `00_Inbox`.

## Current LLM-Wiki Architecture Decision

The system now follows an LLM-wiki pattern:

- RAG or Hermes should retrieve topic pages first to get the map/context.
- Topic pages link back to raw evidence.
- Raw files are used for accuracy checks.
- Entity pages collect references to important actors and concepts.
- Timelines preserve chronological memory.
- Discord queues are draft notifications only.
- `.system` indexes provide machine-readable state for dedupe and orchestration.

## Current Active Vault Layout

```text
00_Inbox/              raw evidence only
10_Topics/             living topic understanding
20_Entities/           people, protocols, companies, chains, tokens
30_Timelines/          chronological memory
40_Synthesis/          daily briefs and future synthesis
50_Research_Answers/   future researched answers
60_Discord_Queues/     pending Hermes notification drafts
80_Templates/          Obsidian templates
90_Archive/            legacy normalized notes and old scaffolds
.system/               ingest-log, dedupe, source, routing indexes
```

## What Still Needs Review

- Whether any old first-version visible folders should be archived, kept, or renamed:
  - `10_Daily_Briefs`
  - `40_Narrative_Briefs`
  - `50_Content_Drafts`
  - `60_Prompt_Rules`
  - `70_Performance`
  - `.ingestion`
- Whether Web Clipper should save directly to `00_Inbox/Web_Clipper/_Raw_Drops/Clippings` or be mirrored there from an external Obsidian `Clippings` folder.
- Whether entity auto-creation is too broad and should require stricter rules.
- Whether topic classification should remain keyword-based until MCP ingestion is added.

## Known Issues

- The project directory is currently not a git repository, so `git status` and `git diff` are unavailable unless the user initializes Git elsewhere.
- `.ingestion` still exists as a legacy folder. New code uses `.system`.
- The daily brief is still rule-based and mostly index-driven.
- Source bundle support exists for mocked linked sources, but real link discovery from arbitrary raw Markdown is still basic and should be improved.
- No real MCP/API integrations exist yet.
- No real Discord API sending exists yet.
- No GBrain/RAG/embeddings exist yet.

## Test Results

Latest verification in this handoff session:

```text
npm run test
tests 12
pass 12
fail 0
```

The tests cover:

- Vault folders and templates.
- Dedupe key precedence.
- Duplicate skipping.
- Raw source preservation instead of normalized inbox notes.
- Safe filenames.
- Path traversal rejection.
- Manual tweet Markdown parsing.
- Manual raw-drop ingestion.
- Web Clipper raw-drop ingestion.
- Same-content/different-filename dedupe.
- Source URL dedupe.
- Mock ingestion projections and source bundle linking.

## Next Recommended Milestones

1. Add a vault health command that checks active folders, raw-only inbox rules, `.system` indexes, and legacy folder drift.
2. Add Hermes-facing CLI commands with a stable interface.
3. Improve real link discovery and source bundle creation from manual/Web Clipper Markdown.
4. Add fixture tests for daily brief contents, entity pages, and Discord queue contents.
5. Add OpenNews/OpenTwitter MCP adapters behind disabled/configured interfaces.
6. Add X bookmarks ingestion once auth and API approach are explicit.
7. Defer GBrain/RAG until the source ingestion and wiki projections are stable.
