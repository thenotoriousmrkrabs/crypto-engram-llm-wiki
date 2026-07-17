import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { MockAdapter } from '../src/main/adapters/mock-adapter.js';
import { ManualMarkdownAdapter } from '../src/main/adapters/manual-markdown-adapter.js';
import { StaticSourceAdapter, normalizeSourceItem } from '../src/main/adapters/source-item.js';
import { WebClipperFolderAdapter } from '../src/main/adapters/web-clipper-folder-adapter.js';
import {
  buildFileContentDedupeKey,
  extractAuthorHandle,
  extractBestTitle,
  extractMainContent,
  parseMarkdownMetadata,
  parseExportDate,
  parseFencedYamlMetadata
} from '../src/main/adapters/folder-markdown-adapter.js';
import { buildDedupeKey } from '../src/main/utils/dedupe.js';
import { splitFrontmatter } from '../src/main/utils/frontmatter.js';
import { PROJECT_ROOT } from '../src/main/utils/paths.js';
import { ingestFromAdapter } from '../src/main/ingestion/pipeline.js';
import { classifySourceItem } from '../src/main/ingestion/classifier.js';
import { TEMPLATE_CONTENT } from '../src/main/obsidian/templates.js';
import {
  REQUIRED_VAULT_FOLDERS,
  createNoteFromTemplate,
  ensureVaultStructure,
  readIngestionLog,
  readSystemIndex,
  safeFileName
} from '../src/main/obsidian/writer.js';
import { lintWiki } from '../src/main/obsidian/lint.js';

test('ensureVaultStructure creates required folders and templates', async () => {
  const vaultRoot = await freshVaultRoot();
  await ensureVaultStructure({ vaultRoot });

  for (const folder of REQUIRED_VAULT_FOLDERS) {
    assert.equal(fsSync.existsSync(path.join(vaultRoot, folder)), true, `missing ${folder}`);
  }

  for (const templateName of Object.keys(TEMPLATE_CONTENT)) {
    assert.equal(
      fsSync.existsSync(path.join(vaultRoot, '80_Templates', templateName)),
      true,
      `missing ${templateName}`
    );
  }
});

test('dedupe key precedence uses source_id, then URL, then title author date hash', () => {
  assert.equal(
    buildDedupeKey({ source: 'opennews', source_id: 'NEWS-1', url: 'https://example.com/a' }),
    'opennews:source_id:news-1'
  );

  assert.equal(
    buildDedupeKey({ source: 'opennews', url: 'https://Example.com/a#fragment' }),
    'opennews:url:https://example.com/a'
  );

  const hashA = buildDedupeKey({
    source: 'manual_md',
    title: 'Same Title',
    author: 'Same Author',
    created_at: '2026-06-26T00:00:00.000Z'
  });
  const hashB = buildDedupeKey({
    source: 'manual_md',
    title: 'Same Title',
    author: 'Same Author',
    created_at: '2026-06-26T12:00:00.000Z'
  });
  assert.equal(hashA, hashB);
  assert.match(hashA, /^manual_md:hash:[a-f0-9]{24}$/);
});

test('duplicate items are skipped during ingestion', async () => {
  const vaultRoot = await freshVaultRoot();
  const item = {
    source: 'opennews',
    source_id: 'duplicate-1',
    title: 'Stablecoin duplicate test',
    text: 'Stablecoin rails are expanding.',
    created_at: '2026-06-26T10:00:00.000Z'
  };
  const adapter = new StaticSourceAdapter({ source: 'opennews', items: [item, item] });

  const result = await ingestFromAdapter({
    adapter,
    vaultRoot,
    now: new Date('2026-06-26T16:00:00.000Z')
  });

  assert.equal(result.ingested.length, 1);
  assert.equal(result.duplicates.length, 1);
});

test('ingestion writes raw source and mechanical projections; node never writes topic or entity pages', async () => {
  const vaultRoot = await freshVaultRoot();
  const adapter = new StaticSourceAdapter({
    source: 'x_bookmarks',
    items: [{
      source: 'x_bookmarks',
      source_id: 'raw-write-1',
      title: 'Hyperliquid raw write test',
      text: 'Hyperliquid HIP-4 creates a useful wiki projection fixture.',
      created_at: '2026-06-26T10:00:00.000Z'
    }]
  });
  const result = await ingestFromAdapter({
    adapter,
    vaultRoot,
    now: new Date('2026-06-26T16:00:00.000Z')
  });

  assert.equal(result.ingested.length, 1);
  assert.match(result.ingested[0].relativePath, /^00_Inbox\/X_Bookmarks\//);
  const raw = await fs.readFile(path.join(vaultRoot, result.ingested[0].relativePath), 'utf8');
  const { frontmatter } = splitFrontmatter(raw);
  assert.equal(frontmatter.type, 'raw_source');
  assert.equal(frontmatter.source, 'x_bookmarks');
  assert.doesNotMatch(raw, /# Summary/);

  const timeline = await fs.readFile(path.join(vaultRoot, '30_Timelines/Hyperliquid.md'), 'utf8');
  assert.match(timeline, /Hyperliquid raw write test/);
  assert.match(timeline, /\[\[00_Inbox\/X_Bookmarks\//);

  // The seam (#17): node does not write topic page bodies or entity pages.
  const topicSeed = await fs.readFile(path.join(vaultRoot, '10_Topics/Hyperliquid/Hyperliquid.md'), 'utf8');
  assert.doesNotMatch(topicSeed, /Hyperliquid raw write test/);
  assert.deepEqual(await listMarkdownFiles(path.join(vaultRoot, '20_Entities')), []);
});

test('ingestion upserts index.md rows and appends a log.md event', async () => {
  const vaultRoot = await freshVaultRoot();
  const adapter = new StaticSourceAdapter({
    source: 'x_bookmarks',
    items: [{
      source: 'x_bookmarks',
      source_id: 'index-log-1',
      title: 'Hyperliquid index row test',
      text: 'Hyperliquid HIP-4 keeps the index catalog fresh.',
      created_at: '2026-06-26T10:00:00.000Z'
    }]
  });

  await ingestFromAdapter({ adapter, vaultRoot, now: new Date('2026-06-26T16:00:00.000Z') });

  const index = await fs.readFile(path.join(vaultRoot, 'index.md'), 'utf8');
  assert.match(index, /\| 30_Timelines\/Hyperliquid\.md \| Hyperliquid timeline \| hyperliquid \|/);

  const log = await fs.readFile(path.join(vaultRoot, 'log.md'), 'utf8');
  assert.match(log, /ingest: "Hyperliquid index row test" → hyperliquid/);

  // Re-ingesting different content for the same topic must upsert, not duplicate, the row.
  await ingestFromAdapter({
    adapter: new StaticSourceAdapter({
      source: 'x_bookmarks',
      items: [{
        source: 'x_bookmarks',
        source_id: 'index-log-2',
        title: 'Hyperliquid second index row test',
        text: 'Hyperliquid HIP-4 second item.',
        created_at: '2026-06-26T11:00:00.000Z'
      }]
    }),
    vaultRoot,
    now: new Date('2026-06-26T17:00:00.000Z')
  });

  const updatedIndex = await fs.readFile(path.join(vaultRoot, 'index.md'), 'utf8');
  const timelineRows = updatedIndex.split('\n').filter((line) => line.startsWith('| 30_Timelines/Hyperliquid.md |'));
  assert.equal(timelineRows.length, 1);
});

test('safeFileName removes unsafe path characters', () => {
  assert.equal(safeFileName('../Bad: File/Name?.md'), 'Bad-File-Name.md');
  assert.equal(safeFileName(''), 'untitled');
});

test('path traversal is rejected', async () => {
  const vaultRoot = await freshVaultRoot();
  await assert.rejects(
    () => createNoteFromTemplate({
      vaultRoot,
      templateName: 'source-note-template.md',
      relativePath: '../escape.md'
    }),
    /escapes allowed root/
  );
});

test('manual exported tweet markdown extracts source metadata and article body', () => {
  const markdown = `# All exported content

## Post 1

\`\`\`yaml
Source: "https://x.com/FourPillarsFP/status/2069998951378702843"
Created At: "2026-06-24_21-19-43"
Post Type: "Article"
\`\`\`

### Article: : : [Crypto/Issue] What Should Exist on HyperEVM?

Written by @ponyo\\_fp

## Key Takeaways

- HyperEVM should be evaluated through Hyperliquid and HyperCore.
`;

  assert.deepEqual(parseFencedYamlMetadata(markdown), {
    Source: 'https://x.com/FourPillarsFP/status/2069998951378702843',
    'Created At': '2026-06-24_21-19-43',
    'Post Type': 'Article'
  });
  assert.equal(extractBestTitle(markdown), '[Crypto/Issue] What Should Exist on HyperEVM?');
  assert.equal(extractAuthorHandle(markdown), 'ponyo_fp');
  assert.equal(parseExportDate('2026-06-24_21-19-43'), '2026-06-24T21:19:43.000Z');
  assert.match(extractMainContent(markdown), /^### Article/);
  assert.doesNotMatch(extractMainContent(markdown), /```yaml/);
});

test('manual markdown raw-drop files update wiki projections and preserve raw text', async () => {
  const vaultRoot = await freshVaultRoot();
  await ensureVaultStructure({ vaultRoot });
  const rawRelativePath = '00_Inbox/Manual_MD/_Raw_Drops/hyperliquid-note.md';
  const rawPath = path.join(vaultRoot, rawRelativePath);
  const rawText = `# Hyperliquid research dump

Hyperliquid and HyperEVM are making the exchange programmable.
`;
  await fs.writeFile(rawPath, rawText, 'utf8');

  const adapter = new ManualMarkdownAdapter({ vaultRoot });
  const items = await adapter.fetch();
  assert.equal(items.length, 1);
  assert.equal(items[0].source, 'manual_md');
  assert.equal(items[0].source_id, rawRelativePath);
  assert.equal(items[0].raw.text, rawText);
  assert.equal(items[0].raw.content_hash, sha256(rawText));
  assert.equal(
    items[0].dedupe_key,
    buildFileContentDedupeKey({
      source: 'manual_md',
      relativePath: rawRelativePath,
      contentHash: sha256(rawText)
    })
  );

  const first = await ingestFromAdapter({
    adapter,
    vaultRoot,
    now: new Date('2026-06-26T18:00:00.000Z')
  });
  const second = await ingestFromAdapter({
    adapter,
    vaultRoot,
    now: new Date('2026-06-26T19:00:00.000Z')
  });

  assert.equal(first.ingested.length, 1);
  assert.equal(second.duplicates.length, 1);
  assert.equal(fsSync.existsSync(rawPath), true, 'raw file should not be deleted');
  assert.equal(first.ingested[0].relativePath, rawRelativePath);

  const raw = await fs.readFile(rawPath, 'utf8');
  assert.equal(raw, rawText);
  const generatedInboxFiles = await listMarkdownFiles(path.join(vaultRoot, '00_Inbox/Manual_MD'));
  assert.deepEqual(generatedInboxFiles.filter((file) => !file.includes(`${path.sep}_Raw_Drops${path.sep}`)), []);

  const topicSeed = await fs.readFile(path.join(vaultRoot, '10_Topics/Hyperliquid/Hyperliquid.md'), 'utf8');
  const timeline = await fs.readFile(path.join(vaultRoot, '30_Timelines/Hyperliquid.md'), 'utf8');
  const queue = await fs.readFile(path.join(vaultRoot, '60_Discord_Queues/hyperliquid.md'), 'utf8');
  assert.doesNotMatch(topicSeed, /Hyperliquid research dump/);
  assert.match(timeline, /Hyperliquid research dump/);
  assert.match(queue, /Status: pending/);

  const log = await readIngestionLog(vaultRoot);
  const ingested = log.find((entry) => entry.event === 'ingested');
  const duplicate = log.find((entry) => entry.event === 'skipped_duplicate');
  assert.equal(ingested.status, 'processed');
  assert.equal(ingested.raw_path, rawRelativePath);
  assert.equal(ingested.content_hash, sha256(rawText));
  assert.equal(duplicate.status, 'processed');
});

test('web clipper raw-drop files ingest recursively into Web_Clipper inbox', async () => {
  const vaultRoot = await freshVaultRoot();
  await ensureVaultStructure({ vaultRoot });
  const rawRelativePath = '00_Inbox/Web_Clipper/_Raw_Drops/Clippings/agent-wallets.md';
  const rawPath = path.join(vaultRoot, rawRelativePath);
  const rawText = `---
title: "Agent Wallets on X"
source: "https://x.com/example/status/1"
created: 2026-06-26
tags:
  - "clippings"
---
## Post

AI agents need wallet permissions, session keys, and explicit policy limits.
`;
  await fs.mkdir(path.dirname(rawPath), { recursive: true });
  await fs.writeFile(rawPath, rawText, 'utf8');

  const adapter = new WebClipperFolderAdapter({ vaultRoot });
  const result = await ingestFromAdapter({
    adapter,
    vaultRoot,
    now: new Date('2026-06-26T18:00:00.000Z')
  });

  assert.equal(result.errors.length, 0);
  assert.equal(result.ingested.length, 1);
  assert.equal(fsSync.existsSync(rawPath), true, 'raw clipping should not be deleted');
  assert.equal(result.ingested[0].relativePath, rawRelativePath);
  assert.equal(parseMarkdownMetadata(rawText).title, 'Agent Wallets on X');

  const generatedInboxFiles = await listMarkdownFiles(path.join(vaultRoot, '00_Inbox/Web_Clipper'));
  assert.deepEqual(generatedInboxFiles.filter((file) => !file.includes(`${path.sep}_Raw_Drops${path.sep}`)), []);
  const timeline = await fs.readFile(path.join(vaultRoot, '30_Timelines/AI_Agents.md'), 'utf8');
  assert.match(timeline, /Agent Wallets on X/);
  const topicSeed = await fs.readFile(path.join(vaultRoot, '10_Topics/AI_Agents/AI_Agents.md'), 'utf8');
  assert.doesNotMatch(topicSeed, /Agent Wallets on X/);
  const routing = await readSystemIndex(vaultRoot, 'routing-index.json', { entries: {} });
  const entry = Object.values(routing.entries).find((candidate) => candidate.title === 'Agent Wallets on X');
  assert.equal(entry.source_url, 'https://x.com/example/status/1');
  assert.equal(entry.topic, 'ai_agents');

  const log = await readIngestionLog(vaultRoot);
  assert.equal(log.at(-1).status, 'processed');
  assert.equal(log.at(-1).raw_path, rawRelativePath);
});

test('same raw content with different filename is deduped by clean content hash', async () => {
  const vaultRoot = await freshVaultRoot();
  await ensureVaultStructure({ vaultRoot });
  const rawText = '# Same Hyperliquid Note\n\nHyperliquid content should dedupe even across filenames.\n';
  await fs.writeFile(path.join(vaultRoot, '00_Inbox/Manual_MD/_Raw_Drops/a.md'), rawText, 'utf8');
  await fs.writeFile(path.join(vaultRoot, '00_Inbox/Manual_MD/_Raw_Drops/b.md'), rawText, 'utf8');

  const result = await ingestFromAdapter({
    adapter: new ManualMarkdownAdapter({ vaultRoot }),
    vaultRoot,
    now: new Date('2026-06-26T18:00:00.000Z')
  });

  assert.equal(result.ingested.length, 1);
  assert.equal(result.duplicates.length, 1);
});

test('source URL dedupe works across different source IDs', async () => {
  const vaultRoot = await freshVaultRoot();
  const adapter = new StaticSourceAdapter({
    source: 'opennews',
    items: [
      { source: 'opennews', source_id: 'one', url: 'https://example.com/item', title: 'Tokenized stocks one', text: 'Tokenized stocks news.', created_at: '2026-06-26T10:00:00.000Z' },
      { source: 'opennews', source_id: 'two', url: 'https://example.com/item#fragment', title: 'Tokenized stocks two', text: 'Different body same URL.', created_at: '2026-06-26T11:00:00.000Z' }
    ]
  });

  const result = await ingestFromAdapter({
    adapter,
    vaultRoot,
    now: new Date('2026-06-26T18:00:00.000Z')
  });

  assert.equal(result.ingested.length, 1);
  assert.equal(result.duplicates.length, 1);
});

test('mock ingestion creates wiki projections, source bundle, and skips second run', async () => {
  const vaultRoot = await freshVaultRoot();
  const first = await ingestFromAdapter({
    adapter: new MockAdapter(),
    vaultRoot,
    now: new Date('2026-06-26T16:00:00.000Z')
  });
  const second = await ingestFromAdapter({
    adapter: new MockAdapter(),
    vaultRoot,
    now: new Date('2026-06-26T17:00:00.000Z')
  });

  assert.equal(first.errors.length, 0);
  assert.equal(first.ingested.length, 7);
  assert.equal(second.ingested.length, 0);
  assert.equal(second.duplicates.length, 7);

  const notePaths = await listMarkdownFiles(path.join(vaultRoot, '00_Inbox'));
  for (const notePath of notePaths) {
    const markdown = await fs.readFile(notePath, 'utf8');
    assert.doesNotMatch(markdown, /# Summary/);
  }

  const sourceIndex = await readSystemIndex(vaultRoot, 'source-index.json', { sources: {}, bundles: {} });
  assert.equal(Object.keys(sourceIndex.sources).length, 7);
  assert.equal(sourceIndex.bundles['hyperliquid-almanack-bundle'].source_ids.length, 2);

  const timeline = await fs.readFile(path.join(vaultRoot, '30_Timelines/Hyperliquid.md'), 'utf8');
  const queue = await fs.readFile(path.join(vaultRoot, '60_Discord_Queues/hyperliquid.md'), 'utf8');
  assert.match(timeline, /The Almanack of Hyperliquid/);
  assert.match(queue, /Suggested Discord Channel: hyperliquid/);

  // The seam (#17): node writes no topic bodies or entity pages, and the
  // resulting vault satisfies the compiled-page contract (no compiled pages yet).
  assert.deepEqual(await listMarkdownFiles(path.join(vaultRoot, '20_Entities')), []);
  assert.deepEqual(await lintWiki(vaultRoot), []);
});

async function freshVaultRoot() {
  const root = path.join(PROJECT_ROOT, '.tmp-tests', crypto.randomUUID(), 'Content_Intelligence_Vault');
  await fs.mkdir(root, { recursive: true });
  return root;
}

function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

async function listMarkdownFiles(root) {
  const entries = await fs.readdir(root, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const entryPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listMarkdownFiles(entryPath));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(entryPath);
    }
  }
  return files;
}
