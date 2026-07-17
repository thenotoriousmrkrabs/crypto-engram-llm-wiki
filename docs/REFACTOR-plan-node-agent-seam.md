# Refactor Plan — Node/Agent Compile Seam (#17)

> Status: ready-for-agent (local — no GitHub issue tracker configured).
> Implements roadmap step 2 of `~/.claude/plans/snug-conjuring-frog.md`, per `docs/PRD-llm-wiki-compile.md`.
> Intended build: **Fable 5 + `/goal` at `xhigh`**, one tiny commit at a time, tests green after each.

## Scope & decisions (confirm or veto)

1. **This refactor = the deterministic node-side slice only.** Cutting the seam (node stops writing topic/entity pages, keeps timelines/queues/index/log), plus its contract tooling (`lintWiki`, `index.md`/`log.md` population), plus dead-code retirement. **The agent `/compile` skill + `CLAUDE.md` compile rules + agent-authored prose are the NEXT slice**, not this one — they're new capability, not a refactor, and they're validated by `lintWiki`.
2. **`lintWiki` scopes to compiled pages only** — any page carrying frontmatter with a `type`. Un-compiled seed scaffolds, `index.md`, and `log.md` (no `type` frontmatter) are skipped, so the seam cut doesn't produce false violations.
3. **The three projection tests are rewritten inside the seam-cut commit** (not before), so the program stays working and green at every commit.

## Problem Statement

On every ingest, node deterministically regenerates topic and entity pages from keyword rules, with no frontmatter and no traceable `sources[]`. This blocks the LLM-wiki: there is no contract for agent-compiled pages, no way to validate them, and node would overwrite any agent synthesis. We need to move topic/entity/summary authorship to the agent while keeping node's mechanical, deterministic projections — and we need a deterministic way to test that the agent's output is well-formed and its citations resolve.

## Solution

Split node's projection routine by artifact type (#17): node keeps timelines, Discord queues, `index.md`, and `log.md`; it stops writing topic/entity pages. Add a deterministic `lintWiki` validator as the contract seam that checks the frontmatter schema (#20) and `sources[]` resolvability on agent-compiled pages. Land it as tiny commits so the program works at every step.

## Commits

1. **Add the `lintWiki` validator (additive, no callers yet).** Introduce a `lintWiki(vaultRoot)` function that scans `05_Sources`, `10_Topics`, `20_Entities`; for every page carrying frontmatter with a `type`, it verifies the #20 contract (`type`, `sources[]`, `confidence` ∈ {high, medium, low}, `published`, `updated`, `tags`), verifies no `relevance` key is present, verifies each `sources[]` entry resolves to an existing raw file under `00_Inbox`, and verifies `type` matches the folder. Pages with no frontmatter are skipped. It returns a list of `{ path, rule, message }` violations. Add unit tests using hand-authored fixture pages: a well-formed page yields zero violations; each deliberately broken fixture (missing field, unresolvable source, present `relevance`, wrong folder) yields exactly its expected violation. Program working; tests green.

2. **Expose `lintWiki` via a script.** Add a `lint:wiki` npm script that runs `lintWiki` against the configured vault, prints any violations, and exits non-zero when violations exist. Additive; no behavior change to ingest. Tests green.

3. **Node populates `index.md` and `log.md` (#15).** Add writers that, on ingest, upsert an `index.md` row (`path │ summary │ tags`) per tracked page and append a `log.md` event, driven by the existing routing/`.system` data. Wire these into the pipeline's post-ingest step (the files were scaffolded in step 1). Add tests asserting a row and a log entry appear after an ingest. Program working; tests green.

4. **Isolate the mechanical projections (no behavior change).** Split the single projection rebuild into two clearly-named internal paths — a mechanical path (timelines + Discord queues + index rows) and the topic/entity page path — with both still invoked. This is the safe preparatory extraction; nothing changes externally. Existing tests unchanged and green.

5. **Cut the seam (the actual #17 change).** Stop invoking the topic-page and entity-page writers from the node path; node now emits only timelines, queues, `index.md`, and `log.md`. In the same commit, rewrite the three affected projection tests (raw-write, manual-markdown, mock) to the new contract: raw is preserved; timeline, queue, index, and log are updated; node does **not** write topic or entity page bodies (topic seed scaffolds may remain empty; `20_Entities` is empty). `lintWiki` returns zero violations on the resulting vault (no compiled pages yet). Program working; tests green under the new contract.

6. **Retire dead v1 code.** Remove the unused normalized-note builder and any now-orphaned helpers that only existed to write v1 normalized notes into the inbox. Tests green.

## Decision Document

- The node projection module is split by artifact type; the topic-page and entity-page writers are removed from the node path (#17). Node retains timelines, Discord queues, `index.md`, and `log.md`.
- A new deterministic `lintWiki` validator is the contract seam for agent-compiled output — it enforces the #20 frontmatter schema and `sources[]` resolvability and forbids a `relevance` field on pages (#10 amendment / #20).
- `lintWiki` validates only pages that carry a `type` in frontmatter; seed scaffolds and the `index.md`/`log.md` files are skipped.
- Node populates the human/agent-readable `index.md` catalog and append-only `log.md` (#15), complementary to `.system/*.json`.
- Relevance/content-potential remain `.system`-only ingest scores (#10 amendment); they never appear on a compiled page.
- The v1 normalized-note builder is retired (it violated raw-only inbox, #1, and was unused).
- Out of this refactor: the agent `/compile` capability, `CLAUDE.md` compile rules, growth-policy enforcement (#19), and any agent-authored prose. Those are validated later by `lintWiki`.

## Testing Decisions

- **Good test:** asserts external behavior, never implementation details, and never asserts LLM prose (it varies per run). The agent's output is tested at the contract level via `lintWiki`, not by wording.
- **Seam 1 — node projections:** extend the existing fresh-temp-vault, assert-file-contents pattern to the new node outputs (timelines, queues, `index.md` rows, `log.md` entries) and to the absence of node-written topic/entity page bodies.
- **Seam 2 — `lintWiki`:** hand-authored fixture pages (fully deterministic, not LLM output) — a well-formed page yields zero violations; each broken fixture yields its specific violation.
- **Modules tested:** the node projection module, the `index.md`/`log.md` writers, and `lintWiki`.
- **Prior art:** the existing suite in `tests/vault.test.js` (vault creation, dedupe precedence, raw preservation, projections, path-traversal rejection).
- **Migration:** the three projection tests that assert node-written topic/entity content are rewritten in commit 5 to the new seam contract. Intended, not a regression.

## Out of Scope

- The agent `/compile` skill/command and `CLAUDE.md` compile rules (next slice).
- Agent-authored source-summary / topic / entity / synthesis prose, and runtime enforcement of the topic-gating / entity-threshold growth policy (#19) — these are agent behavior per `CLAUDE.md`, validated by `lintWiki`, not deterministic code in this refactor.
- Firehose cold-store wiring, promote-on-save, the two Discord channels (#12/#13/#21).
- MCP adapters (#7); GBrain / RAG / embeddings (#6); Discord API sending (#8).

## Further Notes

- Each commit must leave `npm test` green; commit 5 is the only one that rewrites existing tests.
- Reuse over new code: `src/main/utils/frontmatter.js` (`formatFrontmatter`/`splitFrontmatter`), `src/main/utils/paths.js` (`assertInside`), and the existing `.system` index read/write helpers.
- After this slice lands, the next slice authors the `/compile` skill + `CLAUDE.md` rules; `lintWiki` becomes its acceptance check (compiled pages must lint clean).
