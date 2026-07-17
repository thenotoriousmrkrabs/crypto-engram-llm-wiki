# Content Intelligence Vault

An LLM-Wiki for crypto and AI research: raw evidence is curated by a human, and the agent compiles it into an interconnected, self-maintaining wiki that Hermes can later orchestrate.

## Language

**Raw evidence**:
An immutable, captured source artifact (tweet, article, news item, manual drop). The final authority for verification. Lives only in `00_Inbox`.
_Avoid_: source note, normalized note, clipping (when you mean the stored artifact)

**Wiki page**:
An agent-compiled synthesis page (entity, topic, timeline, synthesis, or answer) that carries `sources[]` frontmatter linking back to the raw evidence it was derived from.
_Avoid_: projection, normalized note, generated note

**Compile**:
The act of the agent reading raw evidence and creating or updating wiki pages from it — the two-step "analyze, then generate" pass. The core operation of the system.
_Avoid_: classify (that is only the cheap keyword pre-filter, not the compile), ingest (that is the node-side capture of raw)

**Ingest**:
The deterministic node-side step that captures raw evidence into `00_Inbox`, dedupes it, and records machine state. Precedes compile.
_Avoid_: import, compile

**`sources[]`**:
The frontmatter field on every wiki page listing the raw evidence files (the source of truth) that the page was compiled from. Makes every claim traceable.
_Avoid_: refs, citations (in the frontmatter field name)

**Firehose**:
The continuous, high-volume stream of MCP news/info items. Routed to Discord (for reading) and a cold store (for recovery); never auto-compiled.
_Avoid_: feed, stream (when you mean this specific MCP flow)

**Cold store**:
On-disk storage of the full firehose, excluded from the Obsidian view and from `index.md` — stored, not indexed. A recovery/training layer, never a retrieval source.
_Avoid_: archive (that is `90_Archive`, for legacy material), backup

**Source-summary**:
A per-document wiki page that summarizes one raw doc, carrying `sources[]` + `confidence`, with depth adapted to the document's richness. The retrieval middle tier.
_Avoid_: normalized note, abstract

**Agent-owned root**:
One of the five vault directories whose pages are written exclusively by compile, never by ingest: `05_Sources`, `10_Topics`, `20_Entities`, `40_Synthesis`, `50_Research_Answers`. Presence in one is itself the contract — every page there carries the six frontmatter fields and cites `sources[]`, whoever wrote it. Node materializes the topic folders but writes no page into them.
_Avoid_: agent folder, compiled folder, output directory

**Retrieval surface**:
The set of compiled wiki pages reachable from `index.md` — the only material retrieval ever reads. Distinct from what is merely stored on disk.
_Avoid_: corpus (when you specifically mean what is retrievable)

**Promote** (verb):
The human-triggered action that pulls a firehose item's original raw into `00_Inbox` and compiles it. Turns a read item into curated, indexed knowledge.
_Avoid_: import, save (in prose; "save" is the command name only)

**Digest**:
A ranked shortlist Hermes posts to a Discord channel for human triage — not the raw firehose stream.
_Avoid_: feed, brief (that is `40_Synthesis`)
