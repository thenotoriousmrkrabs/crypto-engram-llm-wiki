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

- Raw source files are written under `00_Inbox`.
- Topic pages are updated under `10_Topics`.
- Entity pages are updated under `20_Entities` when entities are clear.
- Timelines are updated under `30_Timelines`.
- Discord queue drafts are written under `60_Discord_Queues`.
- `.system` indexes are updated.

Run it a second time:

```sh
npm run ingest:mock
```

Expected:

- Items should be skipped as duplicates.
- Topic pages, timelines, and queue files should not duplicate entries.

## Generate Daily Brief

Run:

```sh
npm run brief:daily
```

Expected:

- A daily brief is written to:

```text
vault/Content_Intelligence_Vault/40_Synthesis/YYYY-MM-DD-daily-brief.md
```

- The brief should read from `.system`, `10_Topics`, `30_Timelines`, and `60_Discord_Queues`.

## Run Automated Tests

Run:

```sh
npm run test
```

Expected:

```text
tests 12
pass 12
fail 0
```

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

Inspect daily briefs:

```text
vault/Content_Intelligence_Vault/40_Synthesis
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
