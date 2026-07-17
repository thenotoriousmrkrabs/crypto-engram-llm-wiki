# Testing And Verification

## Setup The Vault

Run:

```sh
npm run setup-vault
```

Expected:

- `vault/Content_Intelligence_Vault` exists.
- Active folders exist, including `00_Inbox`, `10_Topics`, `20_Entities`, `30_Timelines`, `40_Synthesis`, `60_Discord_Queues`, `80_Templates`, `90_Archive`, and `.system`.
- `.system` contains:
  - `ingest-log.jsonl`
  - `dedupe-index.json`
  - `source-index.json`
  - `routing-index.json`

## Run Mock Ingestion

Run:

```sh
npm run ingest:mock
```

Expected:

- Raw evidence is written under `00_Inbox`.
- Timelines are updated under `30_Timelines`.
- Discord queue drafts are written under `60_Discord_Queues`.
- `index.md` rows and a `log.md` line are written.
- `.system` indexes are updated.
- **No page appears in any agent-owned root** — `05_Sources`, `10_Topics`, `20_Entities`, `40_Synthesis`, `50_Research_Answers` (#17/#22). The topic folders exist but stay empty until `/compile` runs.

Run it a second time:

```sh
npm run ingest:mock
```

Expected:

- Items should be skipped as duplicates.
- Timelines and queue files should not duplicate entries.

Note: a re-run on an already-ingested vault proves **dedupe**, not the seam. Dedupe
short-circuits before the write path, so such a run cannot show that node writes no
page — it never reaches the code that would. The seam is proven by the test suite,
which ingests fresh items into a fresh vault and then asserts the agent-owned roots
are empty.

## Validate The Compiled-Page Contract

Run:

```sh
npm run lint:wiki
```

Expected:

- Every page in an agent-owned root carries the six #20 frontmatter fields, and every
  `sources[]` entry resolves to an existing file under `00_Inbox`.
- A page with no frontmatter is a `missing_frontmatter` violation, never a skip (#23).
- Green over an empty vault is vacuous — it means nothing is compiled yet, not that
  the contract holds.

## Run Automated Tests

Run:

```sh
npm run test
```

Expected: all green, `fail 0`. (The count grows as coverage is added; it is not a
fixture to match. At the time of writing: 26.)

## Outputs To Inspect

Inspect raw evidence:

```text
vault/Content_Intelligence_Vault/00_Inbox
```

Inspect active topic projections:

```text
vault/Content_Intelligence_Vault/10_Topics
```

Inspect active entity projections:

```text
vault/Content_Intelligence_Vault/20_Entities
```

Inspect timelines:

```text
vault/Content_Intelligence_Vault/30_Timelines
```

Inspect Discord queue drafts:

```text
vault/Content_Intelligence_Vault/60_Discord_Queues
```

Inspect machine-readable indexes:

```text
vault/Content_Intelligence_Vault/.system
```

Inspect the retrieval entry point:

```text
vault/Content_Intelligence_Vault/index.md
```

## Raw-Only Inbox Check

Search for legacy generated normalized inbox notes:

```sh
rg -n "# Summary|type: (x_bookmark|opennews_item|daily_news_item|manual_md|web_clipper|source_note)" vault/Content_Intelligence_Vault/00_Inbox
```

Expected:

- No matches for generated normalized notes.

## Dependency Check

Run:

```sh
node -e "const p=require('./package.json'); console.log('deps=' + Object.keys(p.dependencies || {}).length + ', devDeps=' + Object.keys(p.devDependencies || {}).length);"
```

Expected:

```text
deps=0, devDeps=0
```
