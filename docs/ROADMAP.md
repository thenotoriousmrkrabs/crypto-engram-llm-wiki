# Roadmap

## Phase 1: Raw-Only Inbox And Projections

Status: mostly implemented.

Goals:

- Keep `00_Inbox` raw-only.
- Preserve manual and Web Clipper raw drops.
- Stop creating normalized inbox notes.
- Write topic pages, entity pages, timelines, Discord queues, and `.system` indexes.
- Keep tests passing.

Remaining work:

- Add a vault health command to detect any future raw-only inbox violations.
- Decide whether remaining legacy folders should be archived or kept for future use.

## Phase 2: Source Bundle Handling

Status: partially implemented.

Goals:

- Represent discovery sources and linked child sources.
- Store bundle relationships in `.system/source-index.json`.
- Improve link extraction from manual and Web Clipper Markdown.
- Add tests for real Markdown link bundle detection.

## Phase 3: Hermes CLI

Status: not started.

Goals:

- Add a stable local command interface for Hermes.
- Provide commands such as `status`, `ingest`, `brief`, `queue`, and `doctor`.
- Keep commands local-first and zero-dependency unless explicitly approved.

## Phase 4: X Bookmarks

Status: not started.

Goals:

- Add real X bookmark ingestion only after auth/API approach is explicit.
- Preserve raw X evidence.
- Dedupe against existing raw/manual/Web Clipper items.
- Avoid browser automation unless explicitly approved later.

## Phase 5: OpenNews And OpenTwitter MCP

Status: deferred.

Goals:

- Wire OpenNews MCP as a structured crypto/news feed.
- Wire OpenTwitter MCP as X/KOL/topic monitoring.
- Keep adapters behind config switches.
- Add tests with fixtures before live integrations.

## Phase 6: Lint And Health Checks

Status: not started.

Goals:

- Add `npm run doctor` or equivalent.
- Verify vault root safety.
- Verify `.system` index consistency.
- Verify no generated normalized notes exist in `00_Inbox`.
- Report duplicate or legacy folders.
- Keep dependency count controlled.

## Phase 7: GBrain And RAG

Status: deferred.

Goals:

- Retrieve topic pages first for map/context.
- Follow source backlinks to raw evidence.
- Use entity pages and timelines as supporting memory.
- Add embeddings/vector search only after local ingestion quality is stable.
- Require citations back to raw evidence.
