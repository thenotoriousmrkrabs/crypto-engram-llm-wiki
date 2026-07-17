import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import { splitFrontmatter } from '../utils/frontmatter.js';
import { PROJECT_ROOT, assertInside, toVaultRelative } from '../utils/paths.js';
import { walkMarkdownFiles } from './writer.js';

// The contract seam for agent-compiled wiki pages (DECISIONS #17/#20/#23).
// Deterministic: validates structure and citations, never prose.
// Presence in an agent-owned root IS the contract (#23): every page there
// must carry the six fields, whoever wrote it. A page with no frontmatter
// is a violation, not a skip — omitting frontmatter must never be the way
// to escape the check.

// The five agent-owned roots (#17/#23), mapped to the #20 page type each holds.
// Exported as the single source of truth: the ingest seam test asserts node
// writes no page into these, and must not hand-copy the list.
export const AGENT_OWNED_ROOTS = Object.freeze({
  '05_Sources': 'source-summary',
  '10_Topics': 'topic',
  '20_Entities': 'entity',
  '40_Synthesis': 'synthesis',
  '50_Research_Answers': 'answer'
});

const REQUIRED_FIELDS = ['type', 'sources', 'confidence', 'published', 'updated', 'tags'];
const CONFIDENCE_VALUES = new Set(['high', 'medium', 'low']);
const FORBIDDEN_FIELDS = ['relevance', 'relevance_score'];

export async function lintWiki(vaultRoot) {
  const safeVaultRoot = assertInside(PROJECT_ROOT, vaultRoot);
  const violations = [];

  for (const [folder, expectedType] of Object.entries(AGENT_OWNED_ROOTS)) {
    const root = path.join(safeVaultRoot, folder);
    if (!fsSync.existsSync(root)) {
      continue;
    }
    for await (const notePath of walkMarkdownFiles(root)) {
      const markdown = await fs.readFile(notePath, 'utf8');
      const { frontmatter, rawFrontmatter } = splitFrontmatter(markdown);
      if (rawFrontmatter === '') {
        violations.push({
          path: toVaultRelative(safeVaultRoot, notePath),
          rule: 'missing_frontmatter',
          message: 'page in an agent-owned root has no frontmatter (#23: presence is the contract)'
        });
        continue;
      }
      violations.push(...lintCompiledPage({
        vaultRoot: safeVaultRoot,
        pagePath: toVaultRelative(safeVaultRoot, notePath),
        frontmatter,
        expectedType
      }));
    }
  }

  return violations;
}

function lintCompiledPage({ vaultRoot, pagePath, frontmatter, expectedType }) {
  const violations = [];
  const violation = (rule, message) => violations.push({ path: pagePath, rule, message });

  for (const field of REQUIRED_FIELDS) {
    if (!(field in frontmatter)) {
      violation('missing_field', `missing required frontmatter field "${field}"`);
    }
  }

  for (const field of FORBIDDEN_FIELDS) {
    if (field in frontmatter) {
      violation('forbidden_field', `frontmatter must not contain "${field}" (relevance is never a page field)`);
    }
  }

  if (frontmatter.type !== expectedType) {
    violation('wrong_folder', `type "${frontmatter.type}" does not belong in this folder (expected "${expectedType}")`);
  }

  if ('confidence' in frontmatter && !CONFIDENCE_VALUES.has(frontmatter.confidence)) {
    violation('invalid_confidence', `confidence "${frontmatter.confidence}" must be one of high, medium, low`);
  }

  for (const field of ['published', 'updated']) {
    if (field in frontmatter && String(frontmatter[field]).trim() === '') {
      violation('empty_field', `frontmatter field "${field}" must not be empty`);
    }
  }

  if ('tags' in frontmatter && !Array.isArray(frontmatter.tags)) {
    violation('invalid_tags', 'tags must be a list');
  }

  if ('sources' in frontmatter) {
    if (!Array.isArray(frontmatter.sources) || frontmatter.sources.length === 0) {
      violation('invalid_sources', 'sources must be a non-empty list of raw evidence paths');
    } else {
      for (const source of frontmatter.sources) {
        violations.push(...lintSourceEntry({ vaultRoot, pagePath, source }));
      }
    }
  }

  return violations;
}

function lintSourceEntry({ vaultRoot, pagePath, source }) {
  const entry = String(source);
  if (!entry.startsWith('00_Inbox/')) {
    return [{
      path: pagePath,
      rule: 'unresolved_source',
      message: `sources entry "${entry}" must be a vault-relative path under 00_Inbox/`
    }];
  }

  try {
    const resolved = assertInside(vaultRoot, path.join(vaultRoot, entry));
    if (!fsSync.existsSync(resolved)) {
      return [{
        path: pagePath,
        rule: 'unresolved_source',
        message: `sources entry "${entry}" does not resolve to an existing raw file`
      }];
    }
  } catch {
    return [{
      path: pagePath,
      rule: 'unresolved_source',
      message: `sources entry "${entry}" escapes the vault root`
    }];
  }

  return [];
}
