import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { PROJECT_ROOT } from '../src/main/utils/paths.js';
import { ensureVaultStructure } from '../src/main/obsidian/writer.js';
import { lintWiki, AGENT_OWNED_ROOTS } from '../src/main/obsidian/lint.js';

const RAW_RELATIVE_PATH = '00_Inbox/Manual_MD/_Raw_Drops/hip-4-report.md';

function wellFormedSummary(overrides = {}) {
  const fields = {
    type: 'source-summary',
    sources: [RAW_RELATIVE_PATH],
    confidence: 'high',
    published: '2026-07-02',
    updated: '2026-07-06',
    tags: ['hyperliquid', 'hip-4'],
    ...overrides
  };

  const lines = ['---'];
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) {
      continue;
    }
    if (Array.isArray(value)) {
      lines.push(`${key}:`);
      for (const item of value) {
        lines.push(`  - ${item}`);
      }
    } else {
      lines.push(`${key}: ${value}`);
    }
  }
  lines.push('---', '', '# HIP-4 Report Summary', '', 'HIP-4 introduces protocol incentives on Hyperliquid.', '');
  return lines.join('\n');
}

async function fixtureVault() {
  const vaultRoot = path.join(PROJECT_ROOT, '.tmp-tests', crypto.randomUUID(), 'Content_Intelligence_Vault');
  await fs.mkdir(vaultRoot, { recursive: true });
  await ensureVaultStructure({ vaultRoot });
  await fs.writeFile(path.join(vaultRoot, RAW_RELATIVE_PATH), '# HIP-4 raw report\n\nRaw evidence text.\n', 'utf8');
  return vaultRoot;
}

async function writePage(vaultRoot, relativePath, markdown) {
  const target = path.join(vaultRoot, relativePath);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, markdown, 'utf8');
}

test('AGENT_OWNED_ROOTS names exactly the five roots #17/#23 assign to the agent', async () => {
  // Pinned deliberately. Dropping a root here would silently narrow BOTH lint's
  // scan and the ingest seam assertion that derives from it.
  assert.deepEqual(Object.keys(AGENT_OWNED_ROOTS), [
    '05_Sources',
    '10_Topics',
    '20_Entities',
    '40_Synthesis',
    '50_Research_Answers'
  ]);
});

test('lintWiki passes a well-formed compiled page', async () => {
  const vaultRoot = await fixtureVault();
  await writePage(vaultRoot, '05_Sources/hip-4-report.md', wellFormedSummary());

  const violations = await lintWiki(vaultRoot);
  assert.deepEqual(violations, []);
});

test('lintWiki flags a page with no frontmatter as exactly one missing_frontmatter violation (#23)', async () => {
  const vaultRoot = await fixtureVault();
  await writePage(
    vaultRoot,
    '10_Topics/Hyperliquid/Hyperliquid.md',
    '# Hyperliquid\n\nProse with no frontmatter, in an agent-owned root.\n'
  );

  const violations = await lintWiki(vaultRoot);
  assert.equal(violations.length, 1);
  assert.equal(violations[0].rule, 'missing_frontmatter');
  assert.equal(violations[0].path, '10_Topics/Hyperliquid/Hyperliquid.md');
});

test('lintWiki scans the synthesis root (#23: all five agent-owned roots)', async () => {
  const vaultRoot = await fixtureVault();
  await writePage(
    vaultRoot,
    '40_Synthesis/2026-07-17-daily-brief.md',
    '# Daily Brief\n\nNode-style brief with no frontmatter.\n'
  );

  const violations = await lintWiki(vaultRoot);
  assert.equal(violations.length, 1);
  assert.equal(violations[0].rule, 'missing_frontmatter');
  assert.equal(violations[0].path, '40_Synthesis/2026-07-17-daily-brief.md');
});

test('lintWiki accepts a well-formed synthesis page in 40_Synthesis', async () => {
  const vaultRoot = await fixtureVault();
  await writePage(
    vaultRoot,
    '40_Synthesis/2026-07-17-weekly-synthesis.md',
    wellFormedSummary({ type: 'synthesis' })
  );

  assert.deepEqual(await lintWiki(vaultRoot), []);
});

test('lintWiki flags a missing required frontmatter field', async () => {
  const vaultRoot = await fixtureVault();
  await writePage(vaultRoot, '05_Sources/missing-confidence.md', wellFormedSummary({ confidence: undefined }));

  const violations = await lintWiki(vaultRoot);
  assert.equal(violations.length, 1);
  assert.equal(violations[0].rule, 'missing_field');
  assert.match(violations[0].message, /"confidence"/);
  assert.equal(violations[0].path, '05_Sources/missing-confidence.md');
});

test('lintWiki flags a sources entry that does not resolve to a raw file', async () => {
  const vaultRoot = await fixtureVault();
  await writePage(
    vaultRoot,
    '05_Sources/bad-source.md',
    wellFormedSummary({ sources: ['00_Inbox/Manual_MD/_Raw_Drops/does-not-exist.md'] })
  );

  const violations = await lintWiki(vaultRoot);
  assert.equal(violations.length, 1);
  assert.equal(violations[0].rule, 'unresolved_source');
});

test('lintWiki flags a sources entry outside 00_Inbox', async () => {
  const vaultRoot = await fixtureVault();
  await writePage(
    vaultRoot,
    '05_Sources/outside-inbox.md',
    wellFormedSummary({ sources: ['10_Topics/Hyperliquid/Hyperliquid.md'] })
  );

  const violations = await lintWiki(vaultRoot);
  assert.equal(violations.length, 1);
  assert.equal(violations[0].rule, 'unresolved_source');
  assert.match(violations[0].message, /00_Inbox/);
});

test('lintWiki forbids a relevance field on compiled pages', async () => {
  const vaultRoot = await fixtureVault();
  await writePage(vaultRoot, '05_Sources/has-relevance.md', wellFormedSummary({ relevance: 'high' }));

  const violations = await lintWiki(vaultRoot);
  assert.equal(violations.length, 1);
  assert.equal(violations[0].rule, 'forbidden_field');
});

test('lintWiki flags a page whose type does not match its folder', async () => {
  const vaultRoot = await fixtureVault();
  await writePage(vaultRoot, '05_Sources/wrong-type.md', wellFormedSummary({ type: 'topic' }));

  const violations = await lintWiki(vaultRoot);
  assert.equal(violations.length, 1);
  assert.equal(violations[0].rule, 'wrong_folder');
});

test('lintWiki flags an invalid confidence value and empty sources list', async () => {
  const vaultRoot = await fixtureVault();
  await writePage(vaultRoot, '05_Sources/invalid-values.md', `---
type: source-summary
sources: []
confidence: certain
published: 2026-07-02
updated: 2026-07-06
tags: []
---

# Broken fixture
`);

  const violations = await lintWiki(vaultRoot);
  const rules = violations.map((violation) => violation.rule).sort();
  assert.deepEqual(rules, ['invalid_confidence', 'invalid_sources']);
});

test('lintWiki validates topic and entity pages in their own folders', async () => {
  const vaultRoot = await fixtureVault();
  await writePage(vaultRoot, '10_Topics/Hyperliquid/Hyperliquid_Compiled.md', wellFormedSummary({ type: 'topic' }));
  await writePage(vaultRoot, '20_Entities/Protocols/HIP-4.md', wellFormedSummary({ type: 'entity' }));

  const violations = await lintWiki(vaultRoot);
  assert.deepEqual(violations, []);
});
