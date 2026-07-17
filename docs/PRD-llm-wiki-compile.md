# PRD — Vault-Side LLM-Wiki Compile Pipeline

> Status: ready-for-agent (local — no issue tracker configured).
> Scope: roadmap steps 2–6 of `~/.claude/plans/snug-conjuring-frog.md`. Step 1 (folder layout, #18) is done.
> Governing decisions: DECISIONS #9–#21. Domain vocabulary: `CONTEXT.md`.

## Problem Statement

The vault is meant to be an **LLM-Wiki**: a persistent, cross-linked knowledge base the agent compiles from raw evidence so retrieval fetches the most accurate answer for the fewest tokens. Today the running code is the v1 rule-based scaffold: on every **ingest**, node deterministically regenerates topic and entity pages from keyword rules, with no frontmatter and no traceable `sources[]`. As a result there is no **source-summary** tier, no human/agent-readable `index.md`/`log.md`, no `confidence`, and no way to trace a claim back to ground truth. Retrieval would have to grep raw or trust un-cited generated prose — the opposite of the accuracy/cost goal.

## Solution

Split the system along the **compile seam** (#17): node stays deterministic and free and only produces **mechanical** artifacts; the **agent compiles** the judgment artifacts. Concretely:

- **Node (continuous, zero-token):** captures **raw evidence** into `00_Inbox`, dedupes, maintains `.system` state, and generates only mechanical projections — **timelines**, **Discord queue drafts**, `index.md` rows, and the append-only `log.md`.
- **Agent (scheduled, token-budgeted):** reads raw and **compiles** wiki pages — **source-summaries** (`05_Sources`), topic pages, entity pages, synthesis, research answers — each carrying the frontmatter contract (`sources[]` + `confidence` + …).
- **Retrieval** loads `index.md` → reads relevant source-summaries/topic pages → **escalates to raw** via `sources[]` only when confidence is low or exact figures are needed.
- A deterministic **`lintWiki`** validator enforces the frontmatter contract and that every `sources[]` resolves to a real raw file — the automated proofreader for structure and citations.

The user curates; the agent compiles; node does the mechanical bookkeeping. No in-process LLM, embeddings, or network — the "compile" runs through the agent (Claude Code, later Hermes) per `CLAUDE.md`, preserving decisions #6/#7.

## User Stories

1. As a curator, I want raw evidence preserved untouched in `00_Inbox`, so that raw stays the source of truth for verification.
2. As a curator, I want node ingest to spend zero tokens, so that continuous capture never costs money.
3. As a curator, I want the agent to compile a **source-summary** for each raw doc, so that I (and retrieval) can read a compressed version without opening the full raw.
4. As a curator, I want a tweet summarized in 1–3 lines and a dense research report given a structured extract, so that summary depth matches the document's richness (#14 adaptive depth).
5. As a curator, I want every compiled page to list the raw files it came from in `sources[]`, so that every claim is traceable to ground truth.
6. As a curator, I want every compiled page to carry a `confidence`, so that shaky pages are visibly flagged.
7. As a retriever (agent), I want to load a cheap `index.md` first, so that I can find relevant pages before spending tokens on their contents.
8. As a retriever (agent), I want to read source-summaries next and open raw only when needed, so that the common query is answered cheaply while accuracy-critical queries still hit ground truth (escalation-to-raw, #14).
9. As a retriever (agent), I want to escalate to raw when `confidence` is low or exact figures/verbatim claims are requested, so that token minimization never caps maximum accuracy.
10. As a curator, I want node to stop generating topic and entity pages, so that only judgment-bearing, cited pages exist for those types (#17).
11. As a curator, I want node to keep generating timelines and Discord queue drafts, so that mechanical, no-judgment artifacts stay free and deterministic.
12. As a curator, I want node and agent to own different files, so that a node rebuild can never overwrite the agent's synthesis.
13. As a curator, I want temporal queries (e.g. a topic's trend over months) answerable, so that dated pages and timelines make time-based comparison cheap (#16).
14. As a curator, I want new topics gated behind my approval, so that the coarse retrieval map stays coherent (#19): the agent proposes a recurring, multi-source, high-rank theme to `log.md`, and I approve before a topic page is created.
15. As a curator, I want content never blocked while a topic proposal is pending, so that raw is still captured, its summary still written, and it attaches to the nearest existing topic until I approve.
16. As a curator, I want entities auto-created once they clear a threshold (≥2 sources, or one high-confidence source explicitly about it), so that fine-grained entities accrue without me approving each one (#19).
17. As a curator, I want an entity that grows into a broad theme to trigger the topic-proposal path, so that things like Hyperliquid can be both an entity and a topic (#19 graduation).
18. As a curator, I want a `lintWiki` check I can run, so that I know every compiled page is well-formed and its citations resolve.
19. As a curator, I want `lintWiki` to flag a page missing frontmatter, a `sources[]` that points at a non-existent raw file, a forbidden `relevance` field, or a page in the wrong folder, so that broken compiles surface immediately.
20. As a curator, I want an `index.md` row per compiled page (`path │ summary │ tags`), so that retrieval and I both have a cheap browsable catalog (#15).
21. As a curator, I want an append-only `log.md` of ingests/compiles/queries/lints, so that I have a chronological record distinct from the machine `.system` JSON (#15).
22. As a curator, I want relevance kept only as an ingest-time score in `.system`, so that it never appears on a page and never gates compilation — human save/promote is the relevance signal (#10 amendment, #21).
23. As a curator, I want compile ordered by content-potential × source-trust × recency, so that the highest-value raw is compiled first within a token budget (#10).
24. As a curator, I want high-intent sources (Web Clipper, Manual MD, X bookmarks) compiled soon and summarized deeply, so that the things I deliberately saved become high-quality wiki pages quickly.
25. As a curator, I want research answers written back into the vault as pages, so that the wiki compounds — answers become future sources (compounding artifact).

## Implementation Decisions

- **Compile seam by artifact type (#17).** Node modules own mechanical artifacts (timelines, Discord queues, `index.md`, `log.md`, raw frontmatter, `.system`). The agent owns judgment artifacts (source-summaries, topics, entities, synthesis, answers). They never co-write the same file.
- **Split the projection rebuild.** The existing deterministic projection routine (currently regenerating topic + entity pages on every ingest) is split: its topic-page and entity-page writers are removed; its timeline, Discord-queue, and index/log generation are retained. The ingest pipeline continues to call the retained mechanical projections.
- **Two clocks (#10).** Ingest is continuous and token-free; compile is a scheduled, budgeted agent pass over a priority queue. Compile priority = content-potential × source-trust × recency. Relevance is demoted to a `.system`-only digest-sort hint (#10 amendment) — never a compile gate, never a page field.
- **Source-summary tier (#14).** A per-raw-doc summary page lives in `05_Sources`, with depth adaptive to the document's richness, carrying the frontmatter contract. Escalation-to-raw is a rule in `CLAUDE.md`.
- **Frontmatter contract (#20).** Every agent-compiled page carries exactly: `type`, `sources[]`, `confidence` (`high`/`medium`/`low`), `published`, `updated`, `tags`. No `relevance`. `explored` is deferred until a consumer exists. Reuse the existing frontmatter utility (`formatFrontmatter`/`splitFrontmatter`).
- **`index.md` + `log.md` (#15).** Node maintains an `index.md` catalog (`path │ summary │ tags`, one row per compiled page) and an append-only `log.md` (ingest/compile/query/lint events), complementary to `.system/*.json`.
- **Compile mechanism (#9).** Compilation runs through the agent via a `/compile` skill/command that follows `CLAUDE.md` (two-step analyze-then-generate). No in-process API, local model, embeddings, or network. `CLAUDE.md` encodes: the seam, escalation-to-raw, the growth policy, and the priority formula.
- **Growth policy (#19).** Topics are gated (agent proposes to `log.md` → human approves → topic page created); entities auto-create at the ≥2-source / one-high-confidence threshold; an entity can graduate to a topic via the same proposal path.
- **`lintWiki` validator (contract seam).** A deterministic module validates each compiled page against the frontmatter contract, resolves every `sources[]` entry to an existing raw file, forbids `relevance`, and checks type↔folder placement. Returns a structured list of violations and emits a `log.md` lint event.
- **Retire the legacy normalized-note builder.** The unused v1 normalized-note builder (which would write into `00_Inbox`, violating #1) is quarantined/removed.

## Testing Decisions

- **What makes a good test:** assert external behavior, not implementation details, and **never assert LLM prose** (it varies per run). The agent's output is tested at the **contract** level, not the wording level.
- **Seam 1 — node projections (deterministic).** Extend the existing pattern: run ingest, then assert on the produced timeline/queue files, `index.md` rows, `log.md` entries, and `.system` state. Assert node **no longer** writes topic/entity pages.
- **Seam 2 — `lintWiki` (deterministic contract seam).** Given a well-formed fixture vault, `lintWiki` returns zero violations. Given deliberately broken fixtures, it flags: missing/invalid frontmatter, a `sources[]` pointing at a non-existent raw file, a present `relevance` field, and a type-in-wrong-folder page. These fixtures are hand-authored markdown, not LLM output — fully deterministic.
- **Modules tested:** the node projection module, the `index.md`/`log.md` writers, and `lintWiki`. The `/compile` step's prose quality is not unit-tested.
- **Prior art:** the existing suite in `tests/vault.test.js` (vault creation, dedupe precedence, raw-preservation, projection assertions, path-traversal rejection) is the template — same fresh-temp-vault + assert-file-contents style.
- **Migration note:** the current projection tests that assert node-written topic/entity page contents will be rewritten to the new seam (node no longer writes those). This is intended, not a regression.

## Out of Scope

- Firehose cold-store wiring, promote-on-save, and the two Discord channels (signal + raw) — design locked (#12/#13/#21), implementation deferred (#8).
- Real MCP/API ingestion adapters (#7).
- GBrain / RAG / embeddings / vector search (#6).
- The quality/behavior of the agent's compiled prose (that is the agent following `CLAUDE.md`, not deterministic code under test).
- Any Discord API sending.

## Further Notes

- **Build model strategy:** the hard slice — the #17 seam split — is the intended **Fable 5 + `/goal` at `xhigh`** implementation target, run against the tiny-commit plan produced next by `request-refactor-plan`. Everything up to that locked spec stays on Opus 4.8.
- The `CLAUDE.md` "Vault Structure" block is still stale from step 1; it will be refreshed as part of the compile-rules edit (roadmap step 4).
- Reuse over new code: `src/main/utils/frontmatter.js`, `src/main/utils/paths.js` (`assertInside`), and the existing `.system` index read/write helpers.
