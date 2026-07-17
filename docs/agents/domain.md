# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

## Before exploring, read these

This repo is **single-context**. There is no `CONTEXT-MAP.md` and no monorepo split.

- **`CONTEXT.md`** at the repo root — the domain glossary (raw evidence, wiki page, compile, ingest, `sources[]`).
- **`docs/DECISIONS.md`** — **this repo's ADRs.** All decisions live in ONE numbered file (#1–#21), not as separate files under `docs/adr/`. **There is no `docs/adr/` directory and its absence is not a signal that this repo has no recorded decisions.** Read the decisions touching your area before proposing changes. Each entry has Decision / Reason / Status.

Both files exist and are load-bearing — they were produced by a `/grill-with-docs` session and drove the current architecture. Read them; do not treat this repo as undocumented.

The "proceed silently if absent" rule applies only to files that genuinely don't exist here (e.g. `CONTEXT-MAP.md`). Don't flag those; don't suggest creating them upfront. The `/domain-modeling` skill (reached via `/grill-with-docs` and `/improve-codebase-architecture`) creates them lazily when terms or decisions actually get resolved.

## File structure

This repo (single-context, ADRs consolidated into one file):

```
/
├── CONTEXT.md                 ← domain glossary
├── CLAUDE.md                  ← project context, safety constraints, compile rules
├── docs/
│   ├── DECISIONS.md           ← the ADRs (#1-#21) — read these
│   ├── ARCHITECTURE.md
│   └── agents/                ← this config
├── src/main/                  ← ingestion, obsidian (writer/wiki/lint), adapters
├── tests/
└── vault/Content_Intelligence_Vault/   ← the LLM-wiki itself
```

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in `CONTEXT.md`. Don't drift to synonyms the glossary explicitly avoids.

If the concept you need isn't in the glossary yet, that's a signal — either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it for `/domain-modeling`).

## Flag ADR conflicts

If your output contradicts a decision in `docs/DECISIONS.md`, surface it explicitly rather than silently overriding. Cite the decision by number:

> _Contradicts DECISION #10 (relevance demoted — it is not a compile gate and never a page field) — but worth reopening because…_

Decisions that are especially easy to re-suggest by accident, because they are deliberate reversals of the obvious choice:

- **#10 amendment** — `relevance` is NOT a compile gate and never appears on a page. Human intent (save/promote) is the relevance signal.
- **#17** — node and agent own *different files*. Do not propose skeleton-then-enrich; it was considered and rejected.
- **#20** — page frontmatter is exactly six fields. A field is added only when something reads it today. `explored` is deferred on purpose.
- **#2** — no normalized notes inside `00_Inbox`. Raw evidence only.
