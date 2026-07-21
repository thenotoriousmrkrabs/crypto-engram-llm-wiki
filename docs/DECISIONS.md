# Architecture Decisions

## 1. `00_Inbox` Is Raw-Only

Decision:

`00_Inbox` stores raw evidence only.

Reason:

Raw files must remain the source of truth. Generated notes in the same folder caused confusion and appeared as duplicated source content.

Status:

Accepted and implemented.

## 2. No Visible Normalized Notes

Decision:

The pipeline should not create visible normalized source notes inside `00_Inbox`.

Reason:

Normalized notes duplicate source text and blur the difference between evidence and interpretation.

Status:

Accepted and implemented for the active ingestion pipeline.

## 3. Hidden Source Cards And Indexes Are Allowed

Decision:

Machine-readable source state is allowed in `.system`.

Reason:

Dedupe, source relationships, routing decisions, and ingestion logs need structured state. Keeping that state hidden avoids cluttering the knowledge vault.

Status:

Accepted and implemented.

## 4. Topic Pages Are Living Understanding

Decision:

`10_Topics` pages are living maps of what the system currently understands.

Reason:

Future Hermes/GBrain retrieval should start with topic pages for context, then follow backlinks to raw evidence for accuracy.

Status:

Accepted and implemented.

## 5. Raw Files Are Source Of Truth

Decision:

Raw source files are the final authority for evidence.

Reason:

Generated summaries and topic pages can be wrong or incomplete. Raw evidence should remain available for verification.

Status:

Accepted and implemented.

## 6. GBrain Deferred

Decision:

Do not implement GBrain, embeddings, vector search, or full RAG yet.

Reason:

The ingestion and vault architecture needs to stabilize first.

Status:

Accepted and deferred.

## 7. Real MCP Integrations Deferred

Decision:

Do not call real MCP/API integrations yet.

Reason:

Adapter contracts and local ingestion behavior should be proven before adding external dependencies, auth, network failures, and provider-specific behavior.

Status:

Accepted and deferred.

## 8. Discord API Deferred

Decision:

Do not send Discord messages yet.

Reason:

The current system should only generate queue drafts. Hermes or a human reviewer should approve notifications before any future sending workflow exists.

Status:

Accepted and deferred.

## 9. The Vault Is The LLM-Wiki; Claude Code Is The Compiler

Decision:

The vault's identity is the LLM-Wiki itself (per Karpathy / nashsu `llm_wiki` / the AI-LLM reference threads), not a rule-based feeder for a separate system. LLM compilation of raw evidence into wiki pages is the core engine. Keyword rules are demoted to a cheap pre-filter/router. The "LLM compile" step is performed by the agent (Claude Code, and later Hermes) following `CLAUDE.md` plus a dedicated ingest skill/slash-command — NOT by an in-process API call, local model, or embeddings library.

Reason:

The reference pattern is fundamentally "LLM compiles raw -> wiki" with two-step analysis-then-generation. Running that compile through the agent (rather than a node API call) keeps the node layer deterministic and zero-dependency, requires no API key, no network, and no embeddings, and therefore does NOT reverse decisions #6 (GBrain/embeddings/RAG deferred) or #7 (MCP/API deferred). It only reframes "LLM" as the operator of the vault, not a library inside it. This matches how every reference implementation actually runs (CLAUDE.md-driven, slash commands like `/save` and `/autoresearch`, Obsidian for browsing).

Status:

Accepted. Supersedes the implicit assumption in the first scaffold that classification/synthesis would remain rule-based. Refines #6/#7 rather than reversing them: no in-process LLM/embeddings/network is introduced.

Division of labor (initial):
- Node (deterministic, zero-dep): ingest raw into `00_Inbox`, dedupe, preserve raw, maintain machine state in `.system`.
- Agent (Claude Code / Hermes): read raw, analyze, write/update wiki pages with `sources[]` frontmatter, maintain the human-readable index and log, lint.

## 10. Two Clocks: Continuous Ingest, Scheduled Compile

Decision:

Ingest (node, deterministic, zero-dep) runs continuously / on every source poll — it captures raw, dedupes, scores, and queues, spending no tokens. Compile (the agent turning raw into wiki pages) runs in scheduled batches (default: morning + night), each capped by a token budget, processing a priority queue top-down. Compile priority = content-potential x relevance x source-trust x recency. Source-trust tiers: manual MD / Web Clipper / X bookmarks = high (compile soon, summarize deeply); MCP news firehose = low (batched, lighter touch unless it hits a watchlist term). High-intent saves may trigger an immediate compile.

Reason:

The MCP feeds are a daily, non-stop firehose while manual/clipper/bookmark saves are rare and high-intent. Separating the cheap deterministic clock (ingest) from the expensive token clock (compile) lets the firehose run non-stop without burning tokens, while batching + budgeting the compile keeps cost bounded on heavy days. Dedupe at ingest means compile never wastes tokens on duplicates.

Status:

Accepted.

Amendment (2026-07-15):

`relevance` is DEMOTED. It is no longer a load-bearing factor gating whether firehose content gets compiled. Rationale: once #12 (promote-on-save) and the source-trust tiers exist, HUMAN INTENT is the relevance signal — high-intent sources always compile (you saved them), and firehose items only enter the wiki when you tap-save them (#21). A computed relevance score therefore has no compile-gating job left. Its only surviving role is a cheap keyword/watchlist SORT for the Discord reading digest (#21) — not a wiki gate, and not a page field (#20). Revised compile priority for the queue = content-potential x source-trust x recency; relevance drops out as a gate and survives only as a digest-sort hint.

## 11. The Retrieval Surface Is The Compiled + Indexed Layer Only (Stored != Indexed)

Decision:

Retrieval reads only the compiled wiki pages reachable from `index.md`; it never greps raw directly. Raw is reached only by following a wiki page's `sources[]` backlink. A file existing on disk does NOT make it retrievable — only being compiled into a page and listed in `index.md` does. Therefore uncompiled / low-priority raw cannot dilute retrieval relevancy.

Reason:

This is the core accuracy mechanism. It decouples "stored" from "indexed", so we can keep large amounts of low-relevance raw for recovery / traceability without degrading retrieval. Relevancy is governed by what we index, not what we store. (Mirrors beihuo's "session files exist but don't enter the index".)

Status:

Accepted. Load-bearing principle behind the firehose / cold-store design (#12).

## 12. MCP Firehose: Discord For Reading, Excluded Cold Store On Disk, Promote-On-Save

Decision:

The MCP news firehose is NOT auto-compiled into the vault. It is routed to (a) Discord channels (per source) as a ranked digest the human reads on mobile, and (b) a cheap cold store on disk that Obsidian is configured to exclude from view (e.g. a `.firehose/` or excluded folder) — stored, not indexed. Only items the human selects are promoted via a save action, which fetches the ORIGINAL raw (re-fetch / from cold store, never the Discord message text) into `00_Inbox`, then compiles it. High-intent sources (Web Clipper, Manual MD, X bookmarks) skip Discord triage and go straight to `00_Inbox` for compile.

Reason:

Keeps the curated vault clean and high-relevance (protecting retrieval accuracy per #11) while preserving the full firehose for recovery and as future training data for filter rules. Discord is the mobile reading surface; Obsidian stays the curated KB. Saving the original raw (not a paraphrase) keeps `sources[]` traceable to ground truth.

Status:

Accepted. Cold store recommended (guards against link-rot / deleted tweets); skip only if never recovering an un-saved item is acceptable.

## 13. Discord Is An I/O Surface, Not A Retrieval Corpus

Decision:

Discord is the human's input (commands to Hermes) and output (news to read) surface. Hermes never searches Discord scroll-back as a knowledge source; all retrieval happens against the compiled Obsidian vault. Discord message history is not the archive and is not `sources[]`-addressable.

Reason:

Discord is ephemeral, not greppable, retention-limited, and not backlinkable. Treating it as a corpus would break traceability (#5) and accuracy (#11). Clean separation: Discord = I/O, vault = corpus + retrieval engine.

Status:

Accepted.

## 14. Source-Summary Tier With Adaptive Depth + Escalation-To-Raw

Decision:

Each compiled raw doc gets a per-source summary page (outside `00_Inbox`) carrying `sources[]` + `confidence`. Summary depth is adaptive: a tweet gets 1-3 lines; a dense research report gets a structured extract (thesis, key data / numbers, methodology, caveats, figure callouts) and may include verbatim "key extracts". CLAUDE.md must encode an escalation rule: if a query needs specific figures, verbatim claims, methodology, or the summary's confidence is low, the agent MUST open the raw via `sources[]` rather than answer from the summary alone.

Reason:

The summary tier is the retrieval middle layer (timyangnet's summary layer, nashsu's sources/) that lets the agent answer without loading full raw — the main token saver. Adaptive depth prevents thin summaries from losing important detail in rich docs. Escalation-to-raw guarantees accuracy-critical queries always hit ground truth, so token minimization applies to the common case without capping max accuracy. This does NOT reverse #2 (no normalized notes IN `00_Inbox`): summaries are compressed syntheses living outside the inbox, not duplicates inside it.

Status:

Accepted.

## 15. Human/Agent-Readable index.md + log.md

Decision:

Add a markdown `index.md` (one line per wiki page: path | summary | tags) as the retrieval entry point, and an append-only `log.md` recording ingests / compiles / queries / lints. These are distinct from and complementary to the machine-readable `.system/*.json` state (which stays for dedupe / routing).

Reason:

The references make `index.md` the cheap always-loaded entry point for retrieval (load index -> read summaries -> open raw if needed) and `log.md` the chronological record. The current vault only has machine JSON in `.system`, which the retrieval cascade cannot use as a human / agent-browsable catalog.

Status:

Accepted.

## 16. Forward-Accumulating; No Backfill; Dated Pages + Timelines For Temporal Queries

Decision:

The vault starts empty at launch and accumulates only going forward — there is no historical backlog to import (the user begins dumping after the build). Depth is a function of run-time, not build-time; temporal queries (e.g. "Hyperliquid growth over months") become answerable only after enough accumulation. To support such queries, wiki pages carry `date`/`published` frontmatter and `30_Timelines` threads dated evidence; topic pages may maintain a metrics-over-time section.

Reason:

No existing clips exist to backfill, so no cold-start import pass is needed. Temporal comparison is a first-class query type that needs dated structure and a timeline layer to answer cheaply and accurately.

Status:

Accepted.

## 17. The Node/Agent Compile Seam Splits By Artifact Type

Decision:

The boundary between the deterministic node layer and the agent compile is drawn by artifact type:
- Node (deterministic, zero-dep, continuous): MECHANICAL projections that need no judgment — timelines (date-sorted lists), Discord queue drafts, `index.md`/`log.md` scaffolding, raw-source frontmatter, `.system` state.
- Agent (compiled, token-spending, scheduled): anything requiring synthesis or judgment — source-summaries, topic pages, entity pages, synthesis/daily briefs, research answers — each carrying `sources[]` + `confidence`.
Node and agent own DIFFERENT files; they never co-write the same file.

Reason:

This is the concrete restatement of #9's division of labor and #10's two-clocks. It keeps cheap, already-working deterministic generation for mechanical artifacts (and their passing tests), spends tokens only where real understanding is required, and avoids the overwrite conflict of a skeleton-then-enrich model (node regenerating a page would erase the agent's synthesis). Rejected alternatives: "everything agent-compiled" (wastes tokens on mechanical lists, discards working code) and "skeleton + enrich same file" (node/agent fight over one file).

Status:

Accepted. Supersedes the v1 approach where `rebuildWikiProjections` deterministically generated topic/entity pages from templates. Implication: topic/entity page generation must move out of node's deterministic rebuild and become an agent compile step; node retains timeline + queue generation.

## 18. Folder Layout

Decision:

- Keep the numbered folder scheme (`00_`, `05_`, `10_`, ...) — do not rename.
- `firehose/` cold store lives OUTSIDE the Obsidian vault (project-level sibling to `vault/`), so firehose volume never bloats the curated KB or its backups.
- `05_Sources/` (per-source summary tier) slots between `00_Inbox` and `10_Topics`.
- Add `index.md` and `log.md` at the vault root (per #15).
- Archive legacy drift folders into `90_Archive`: `10_Daily_Briefs`, `40_Narrative_Briefs`, `50_Content_Drafts`, `60_Prompt_Rules`, `70_Performance`, `.ingestion`.

Target layout:

```text
content-intelligence-system/
  firehose/                         cold store, OUTSIDE vault, stored-not-indexed (#12)
  vault/Content_Intelligence_Vault/
    index.md                        retrieval entry point (#15)
    log.md                          append-only ops log (#15)
    00_Inbox/                       raw evidence, curated/high-intent (#1,#5)
    05_Sources/                     per-source summaries, AGENT-compiled (#14)
    10_Topics/                      topic pages, AGENT-compiled (#17)
    20_Entities/                    entity pages, AGENT-compiled (#17)
    30_Timelines/                   timelines, NODE/mechanical (#17)
    40_Synthesis/                   daily briefs + synthesis, AGENT (#17)
    50_Research_Answers/            query write-backs, AGENT (#14)
    60_Discord_Queues/              queue drafts, NODE/mechanical (#17)
    80_Templates/
    90_Archive/                     legacy folders moved here
    .system/                        machine state, NODE (#3)
```

Reason:

The established numbered scheme sorts cleanly in Obsidian, so renaming would only churn. Putting `firehose/` outside the vault keeps the curated vault clean and protects retrieval relevancy (#11/#12). `05_Sources/` between Inbox and Topics reflects the pipeline order raw -> summary -> topic. Archiving legacy folders removes number collisions (two each of 10/40/50/60) and pre-model clutter.

Status:

Accepted.

## 19. Topic Growth Is Gated; Entity Growth Is Auto-Thresholded

Decision:

Topics and entities grow by different rules:
- **Topics are gated.** The agent works within the existing `10_Topics/` list. When it detects a *recurring, multi-source, high-rank* theme that fits no existing topic, it logs a **proposed** new topic (to `log.md` + a Discord nudge) rather than silently creating a folder. The human approves -> the topic page is created. Trigger to propose = recurrence + quality (not a single mention): e.g. sustained high-priority coverage across >= N sources.
- **Content is never blocked while a topic proposal is pending.** The raw is still captured, its source-summary is still written, and entities are still created; the item attaches to the nearest existing topic (or a catch-all like `Crypto_Market_Structure`) until approval. Approval controls the *grouping only*, never whether knowledge is kept.
- **Entities are auto-created, thresholded.** An entity page is created automatically once it clears a bar: **appears in >= 2 sources, OR one high-confidence source explicitly about it.** No human approval needed. (Below the bar, the name can still be mentioned inline on a page without getting its own entity file.)
- **Entities can graduate to topics.** An entity that later generates sustained multi-source coverage in its own right triggers the same topic-proposal path. (This is why a thing like Hyperliquid is both an entity — the chain — and a topic — the whole area.)

Reason:

Topics are the coarse retrieval map; letting the agent spawn folders freely would fragment the map and hurt relevancy (#11), so a human gate keeps the taxonomy coherent — but blocking capture on approval would lose knowledge, so capture proceeds and only grouping waits. Entities are fine-grained and numerous; gating each one behind approval would be unusable, so they key on a concrete recurrence/confidence threshold (not sentiment like "significant impression", which is uncodeable). The graduation path lets fine-grained entities become coarse topics when they earn it, keeping the map current without manual bookkeeping. Sharpens the handoff's open question ("entity auto-creation may be too broad") and CLAUDE.md's open question on which entity types need approval.

Status:

Accepted. Threshold value (N sources for a topic proposal; the >=2 / high-confidence entity bar) is a tunable config, defaults as stated.

## 20. Page Frontmatter Schema: Only Fields With A Live Reader

Decision:

Every AGENT-compiled wiki page (source-summary, topic, entity, synthesis, research-answer) carries this frontmatter and no more:

```yaml
---
type: topic            # topic | entity | source-summary | synthesis | answer  -> index.md filtering
sources: [...]         # raw files this page was compiled from -> ground-truth backlink (#5/#11/#14)
confidence: high       # high | medium | low -> drives escalation-to-raw (#14)
published: 2026-07-02  # date the EVIDENCE was published -> temporal queries + timelines (#16)
updated: 2026-07-06    # date the PAGE was last compiled -> staleness / "when last touched"
tags: [hyperliquid]    # few routing keywords -> index.md line is path | summary | tags (#15)
---
```

Governing rule: **a field is added only when something actually READS it today.** Two candidate fields are deliberately excluded:
- `relevance` — NOT a page field. Relevance is judged fresh against each query, so a stored score is either ignored or stale/misleading. The one useful relevance decision happens at ingest and lives in `.system` (see #10 amendment), never on the page.
- `explored` (stub/partial/explored) — DEFERRED, not dropped. It only earns its keep once a consumer exists (an `/autoresearch` deepening loop or a dashboard). Neither is in the current plan, so adding it now is a field with no reader. Add it if/when that consumer is built.

Raw evidence files are NOT covered by this schema — they carry node-written raw frontmatter (id, source url, captured date, ingest score) and are the source of truth, not compiled pages.

Reason:

The frontmatter is the only machine-readable handle retrieval and maintenance have; a field nothing reads is token overhead on every page, and premature fields (like the three-state `explored` the user found confusing) are dead weight until their reader exists. `confidence` is retained because it drives the load-bearing escalation-to-raw behavior (#14); `sources[]` because it is the ground-truth backlink; `published`/`updated` because #16 makes temporal queries first-class and staleness cheap to check; `tags`/`type` because #15's index format and page-type filtering read them. This is an independent first-principles call, not deference to the reference vaults — those informed `confidence`/`explored` but are treated as one person's evidence, not proof of good design.

Status:

Accepted. `explored` is a documented future addition gated on building its consumer.

## 21. Discord Reading Surface: Two Channels (Signal + Raw Firehose), Sort Not Gate

Decision:

The firehose reaches the human as reading through TWO Discord surfaces, both backed by the same cold store (#12):
- A **signal** channel: relevance-sorted / lightly filtered (watchlist + keyword hits floated to top or shown alone) — the low-noise default reading surface.
- A **raw firehose** channel: the full unfiltered stream, everything the MCP ships — for deliberate digging.

Filtering here is SAFE because it only decides what hits your eyes, never what enters the wiki: nothing shown or hidden is lost (cold store keeps all; #11/#12). The wiki gate remains **tap-to-save** (human judgment; #12) — relevance never auto-compiles anything into the retrieval surface. Relevance's role at this surface is a SORT/SURFACE hint only, consistent with the #10 amendment.

Reason:

Separating "what to read" from "what to index" lets us cut reading noise without risking retrieval accuracy — the two-channel split gives a curated default plus a full-recall escape hatch, and because both sit on top of the cold store, any filtering is reversible. Auto-compiling by keyword score was rejected: auto-compiled = indexed = in the retrieval surface, which reintroduces the exact dilution risk #11 was built to prevent. Human tap stays the only wiki gate.

Status:

Accepted. Discord API sending remains deferred (#8); this is the design the future bot implements. Filter aggressiveness on the signal channel is tunable config.

## 22. Node Materializes The Approved Topic Folder Map; The Agent Writes The Pages

Decision:

Node keeps creating the `10_Topics/<Topic>/` directories via `REQUIRED_VAULT_FOLDERS`, but writes **no page** into them. `ensureInitialTopicPages` — which seeded six topic pages with authored prose on every ingest — is deleted. Folders: node. Pages: agent.

Reason:

#17 splits ownership **by artifact type**, and a directory is not an artifact. A wiki page carries judgment and cites `sources[]`; an empty directory makes no claim and cannot be wrong, so node creating one is not co-writing the agent's file. The seeds were a real #17 violation (node authored "Hyperliquid is tracked as an evolving intelligence topic" into the agent's file, on every ingest, which is the skeleton-then-enrich model #17 rejected) — but the folders are not.

The folder map must stay node's job because **#19 depends on it existing**: "the agent works within the existing `10_Topics/` list" and must never silently create a folder. The materialized folder list *is* the human gate. If node stopped creating it, the agent would need `mkdir` to compile anything — which is precisely the silent folder creation #19 forbids. The folders are also the coarse retrieval map (#11), and under #16 (forward-accumulating, starts empty) an empty-but-present map is the correct day-one picture.

Recorded because the alternative is invisible from outside: a future architecture review sees node touching `10_Topics/` and flags it as the same seam violation just fixed. The distinction is the reasoning above, and removing folder creation would silently break #19's gate.

Known cost: node still hardcodes the topic list in `REQUIRED_VAULT_FOLDERS` — one of four hand-synced topic lists (`classifier.js` `TOPIC_RULES`, `wiki.js` `TOPICS`, `REQUIRED_VAULT_FOLDERS`, `config/topics.yaml`). Collapsing those is a separate open candidate; this decision does not make it worse.

Status:

Accepted.

## 23. Presence In An Agent-Owned Root Is The Frontmatter Contract; Hand-Written Knowledge Is Raw Evidence

Decision:

Any `.md` under the five **agent-owned roots** (`05_Sources`, `10_Topics`, `20_Entities`, `40_Synthesis`, `50_Research_Answers`) must carry #20's six frontmatter fields, **regardless of author**. `lintWiki` scans all five and emits a single `missing_frontmatter` violation when frontmatter is absent — not six `missing_field` ones.

The escape hatch `if (!frontmatter.type) continue;` is **deleted**. It made omitting frontmatter the way to *escape* the check, which is the exact failure the check exists to catch. It reported "clean" over seven node-written entity pages carrying prose judgment and no `sources[]`.

A human who wants to write knowledge by hand puts it in `00_Inbox/Manual_MD/` as raw evidence — which is what it is, a human-authored source. It is then compiled like anything else, and the resulting wiki page cites the human.

Reason:

A page without `sources[]` cannot be traced to evidence, and #5 makes raw the final authority. Retrieval cannot distinguish "the human knew this" from "the machine made it up" — so an uncited page in the retrieval surface is indistinguishable from a fabrication, which is what #11 exists to prevent. Routing hand-written knowledge to `Manual_MD` keeps #2 intact (raw evidence only in `00_Inbox`; no normalized notes) while giving human authorship a real home rather than an exemption.

No allowlist for `README`/folder notes: zero such files exist in those roots, and a rule with no reader violates #20's governing principle ("a field is added only when something actually reads it"). Add one if a real non-page ever needs to live there.

Status:

Accepted.

## 24. Capture Policy: Primary Source Is Evidence, Bookmarks Are Discovery; Relevance And Confidence Are Different Dials

Decision:

Two things are settled here — how to capture, and how the two quality dials differ.

**Capture the primary source, not the pointer.** A tweet that *announces* an essay is a discovery signal; the essay itself is the evidence. Because raw is the source of truth (#5) and node never fetches (#7 deferred), the raw file must *contain* the truth, not link to it. So: web-clip the full article (the true link), not the tweet about it. Bookmark freely for discovery; web-clip the full article for anything the wiki should actually know.

**Capture mechanism is source-blind.** The one real folder adapter ingests any markdown dropped into a watched `_Raw_Drops` lane, regardless of origin (browser extension, paste, script). A tweet is a web page, so a bookmarked tweet enters the vault identically to any web clip — clip its URL. Once in `00_Inbox`, the pipeline (dedupe → classify → timeline → index → compile) treats every raw file the same; `source:` is only a label. Handling is uniform; **quality out tracks richness in**, not the lane.

**Relevance and confidence are orthogonal.** The human act of saving/bookmarking/clipping is the *relevance* signal (#10 amendment: human intent decides what enters the wiki). It does NOT set *confidence*. Confidence (#20) measures how well the captured content backs the claim: `high` = source explicit and being restated; `medium` = inferred/merged; `low` = thin/single-source/contradicted. A deeply-wanted bookmark that captured only a snippet is high-relevance, low-confidence — exactly the HIP-4 case in the first compile. Curation makes it worth compiling; only richness makes it high-confidence. Confidence is load-bearing: `low` triggers escalation-to-raw at read time (#14).

**Same story, multiple captures, is kept — not deduped away.** Different captures of one article (bookmark + full clip + stub) have different URLs/content, so dedupe (URL / source_id / content-hash / title+author+date) keeps them all; only identical re-captures (same URL) are dropped. The system can bundle them as discovery-source + child-source (one story). Ideal is both: essay as evidence, bookmark as discovery context.

**The future X-bookmark integration is a fetch adapter over the existing tested pipeline.** When #7/#8 build it, an adapter calls X's bookmarks API (OAuth user-context; paid, access-restricted — verify current terms before scoping), maps each tweet to a `SourceItem`, and hands it to the same pipeline web clips already use. Incremental "new bookmarks only" is handled by existing dedupe (re-pull is idempotent; only unseen tweets create new raw). Only the fetch + auth is new and untested; steps 2–4 are the proven path (the Almanack tweet went through it, and re-ingest-skips-duplicates is verified).

Reason:

The first `/compile` surfaced these: retrieval quality is capped by capture quality, and confidence is a mechanical readout of captured richness, not a judgment of the topic. Writing it down keeps future-you and Hermes from (a) capturing pointers instead of evidence, (b) conflating "I care about this" with "this is well-supported", and (c) fearing the bookmark path is an unknown system when it is a thin fetch adapter over a tested pipeline. The `x_bookmarks` folder + adapter stub are currently vestigial: the web-clipper lane already captures tweets; #7 would make bulk auto-sync real.

Status:

Accepted. Automatic bundle-detection from real clipped links, and the X fetch adapter, remain deferred builds (#7); the capture policy and dial distinction are binding now.

## 25. 6551 MCP Firehose: Runtime Topology, Two-Channel opennews, Watch-Driven opentwitter, daily-news Dropped

Decision:

The three 6551Team MCPs (opennews-mcp, opentwitter-mcp, daily-news) become the first real firehose sources (#7/#8). A single premium `OPENNEWS_TOKEN` covers opennews + opentwitter; daily-news is free/no-key. All hit the same 6551 backend (`https://ai.6551.io`). Reference: `docs/sources/6551-mcp-reference.md`.

**Runtime topology — three roles, kept separate.** The always-on connector is neither Claude Code nor Hermes; it is a plain **node relay service** (dumb plumbing, no AI):

- **Builder** (Codex / Claude Code): build-time only. Writes the relay + compile procedure. Not in the runtime loop; never a persistent 3rd-party connector.
- **Relay** (node service, always-on, no AI): opens the 6551 **WebSocket directly** (`wss://ai.6551.io/open/news_wss?token=`, `.../twitter_wss?token=`) and forwards events to Discord. Holds the Discord bot token + 6551 token. Does dedup, routing, posting. Needs no MCP server and no agent to run.
- **Brain** (Hermes, on the user's Codex account, in Discord): on-demand judgment only — compile / summarize / research, triggered by the relay on tap-to-save or a typed command. Uses the **MCP servers** (opennews-mcp, opentwitter-mcp) for on-demand *pull* queries.

This is the #17 seam at runtime: mechanical (relay, node, 24/7) vs judgment (Hermes, on demand). The brain is swappable (Codex/Claude/Hermes) because the relay carries the persistent connection, not the agent. Resolves the "Claude Code can't be a persistent 3rd-party connector" constraint — it never needs to be.

**Push vs pull split.** Relay uses the WebSocket **push** path (talks to 6551 directly, no MCP). The command center uses the MCP **pull** tools (`get_high_score_news`, `search_twitter`, etc.) via Hermes. MCP is a wrapper for agent use; the relay bypasses it.

**opennews — two channels (revives #21's filter-level split, now on a real mechanic).**
- `#opennews-raw`: subscribe wide, forward everything (`news.update` + `news.ai_update`). The complete, fast/breaking backstop (full recall, #12).
- `#opennews-signal`: same pipe, forward only `news.ai_update`, gated/sorted by `aiRating.score`. The curated, confirmed/rated view.
- Cross-channel overlap is **intentional** (option A): a high-quality item appears in both — raw as the complete log, signal as the shortlist you actually read; raw gets it first (unrated), signal later (scored). Never deduped across channels.
- Within a channel, **dedup by event `id`** to collapse the async double-hit (`news.update` then `news.ai_update`, same `id`). Relay's job; 6551 does not dedup.
- "Crypto only" is approximated by `hasCoin:true` + naming crypto sources under the `news` engine (no `category=crypto` exists). Score/keyword/signal filters exist only on the pull tools, not the subscribe params — fine score-gating happens in the relay on `aiRating.score`.

**opentwitter — watch-driven, connect-now/populate-later.** `twitter.subscribe` pushes **only accounts on the server-side watch list**; empty watch = silent channel (opposite of opennews, where empty = everything). Connect the plumbing now with an empty watch; Hermes populates it later via `add_twitter_watch` per KOL. Pull/search tools work immediately even with an empty watch (command center usable day one). The watch list is **server-side state tied to the token** — audited via `get_twitter_watch`; open question deferred: purely-Hermes-managed vs reconciled against `config/watchlists.yaml`.

**daily-news — dropped.** Free, no-key, pull-only, no push — a thin subset of the same 6551 backend opennews already returns in full under premium. Not wired as a channel. Kept documented in the reference only as a zero-auth **free fallback** if the token ever lapses.

**Architectural line crossed (deliberate).** This slice introduces, for the first time, real network I/O, an always-on process, and likely one runtime dependency (a WebSocket/Discord client) — all previously under README's *Intentionally Not Built Yet* and the zero-dependency rule. Crossing is intentional and scoped to the relay. Any dependency add still requires explicit approval (existing constraint unchanged). The wiki boundary is untouched: relay → Discord (read) + cold store; only human-promoted items cross into the wiki (#11/#12). These MCPs never auto-feed the wiki.

Reason:

Settles the firehose design that #7/#8 deferred, using the actual 6551 tool/endpoint contract rather than the earlier `Future`-marked guesses in `config/sources.yaml`. The two-channel opennews gives a complete backstop plus a curated view off one subscription; the id-dedup handles 6551's async raw-then-scored delivery; watch-driven opentwitter matches how the API actually pushes; dropping daily-news avoids a redundant channel. Writing the runtime topology down prevents the recurring blur between builder, relay, and brain — and records that the persistent Discord/WebSocket connection is dumb node code, not an AI session, so no agent needs to "stay connected." grilling was deliberately skipped: the channel/feature design was fully resolved interactively (active/passive, ai_update-inside-subscribe, overlap, dedup), leaving only tunable thresholds and the network-line decision — none of which need an interview.

Status:

Accepted (design). Build deferred to the `/request-refactor-plan` breakdown: the relay (network line + WebSocket client + dedup + Discord routing) sequenced as tiny commits, operational failure-modes (reconnect, 6551 downtime, token expiry, Discord rate-limits, dedup window) addressed there. Signal-channel score threshold and whether opentwitter gets its own raw/signal pair are post-traffic tunables. daily-news adapter remains unbuilt (free-fallback note only).

### #25 Addendum — Build Shape (issue #3): Scheduled Pull Over Live WebSocket; Bot + Promote Mechanics

Decision:

The first firehose build (issue #3) arrives by **scheduled pull, not live WebSocket**, and interaction is a **discord.js gateway bot** with a 💾 tap-to-save:

- **Scheduled over live.** Delivery to Discord is plumbing (HTTP, zero LLM tokens) either way; tokens are spent only at compile-on-promote, which the human tap gates — so live buys nothing on the overriding token goal. Scheduled clumps arrivals, nudging batched promotes → batched compiles that amortize per-call overhead. It also avoids the persistent socket, reconnect/backoff, and the raw-then-scored async double-hit entirely: a failed tick just catches up next tick. Default interval 20 min (`FIREHOSE_PULL_INTERVAL_MINUTES`), modest so pulls stay under the ~100-row `news_search` cap. Live remains a per-channel upgrade **only** if a trading-latency source ever appears; because arrival is decoupled from the bot, that swap touches neither promote nor tap-to-save.
- **Bot, not webhook**, because tap-to-save must *receive* reactions; `discord.js` is the sole approved dependency (recorded in CLAUDE.md). The bot is a thin shell over tested functions; only its live Discord/timer I/O is smoke-tested.
- **Marker-based promote.** Every posted message embeds a `` `source:id` `` line; the reaction handler parses it and promotes exactly that cold-store item through the existing ingestion pipeline into `00_Inbox/OpenNews` — the only firehose → wiki crossing (#12), deduped and logged like any ingest. Markers survive bot restarts (no in-memory message map).
- **Single reading channel first.** The raw/signal two-channel split is deferred until real traffic justifies it; `aiRating` (score/grade/signal) is preserved under `raw`, so adding score-gating later needs no rework.
- The 6551 REST contract was **verified against the opennews-mcp server source** (Bearer auth, `POST /open/news_search` with a JSON body, `{ data, total }`), superseding the README-level guesses noted in `docs/sources/6551-mcp-reference.md`. **Correction (2026-07-21):** an earlier note here recorded this as `GET`, and shipped code sent `GET`, which the `ai.6551.io` gateway answered with a live `404` on the path (not `405`). Re-verified against `src/opennews_mcp/api_client.py` (`self._request("POST", …/open/news_search, json=body)`) and fixed to `POST` + JSON body.

Reason:

Recorded so the scheduled-vs-live choice reads as deliberate token/workload economics, not a temporary shortcut — and so nobody "upgrades" to the WebSocket relay without a trading-latency case.

Status:

Accepted; built on branch `feat/opennews-firehose` (issue #3, commits 1–14).
