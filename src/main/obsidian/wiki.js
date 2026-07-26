import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import {
  SOURCE_FOLDERS,
  ensureVaultStructure,
  readDedupeIndex,
  readSystemIndex,
  safeFileName,
  writeDedupeIndex,
  writeSystemIndex
} from './writer.js';
import { normalizePart, normalizeUrl } from '../utils/dedupe.js';
import { assertInside, toVaultRelative } from '../utils/paths.js';
import { topicInfo } from '../config/topics.js';

export { topicInfo };

export async function saveOrPreserveRawSource({ vaultRoot, item, now = new Date() }) {
  const safeVaultRoot = await ensureVaultStructure({ vaultRoot });
  if (item.raw?.path) {
    const existingPath = assertInside(safeVaultRoot, path.join(safeVaultRoot, item.raw.path));
    const rawText = await fs.readFile(existingPath, 'utf8');
    return enrichRawItem(item, {
      rawPath: existingPath,
      relativePath: toVaultRelative(safeVaultRoot, existingPath),
      rawText
    });
  }

  const folder = SOURCE_FOLDERS[item.source] || '00_Inbox';
  const folderPath = assertInside(safeVaultRoot, path.join(safeVaultRoot, folder));
  await fs.mkdir(folderPath, { recursive: true });
  const date = isoDate(item.created_at || item.captured_at || now);
  const fileName = `${date}-${safeFileName(item.title || item.source_id || item.url)}.md`;
  const rawPath = assertInside(safeVaultRoot, path.join(folderPath, fileName));
  const rawText = buildRawSourceMarkdown(item, now);

  if (!fsSync.existsSync(rawPath)) {
    await fs.writeFile(rawPath, rawText, 'utf8');
  }

  return enrichRawItem(item, {
    rawPath,
    relativePath: toVaultRelative(safeVaultRoot, rawPath),
    rawText: fsSync.existsSync(rawPath) ? await fs.readFile(rawPath, 'utf8') : rawText
  });
}

export function buildWikiDedupeKeys(item) {
  const keys = [];
  if (item.url) {
    keys.push(`url:${normalizeUrl(item.url)}`);
  }
  if (item.source_id) {
    keys.push(`source_id:${normalizePart(item.source)}:${normalizePart(item.source_id)}`);
  }
  if (item.raw?.clean_content_hash) {
    keys.push(`content:${item.raw.clean_content_hash}`);
  }
  if (item.title) {
    const titleDateHash = sha256([
      normalizePart(item.title),
      normalizePart(item.author_handle || item.author || 'unknown'),
      isoDate(item.created_at || item.captured_at || '')
    ].join('|'));
    keys.push(`title_author_date:${titleDateHash}`);
  }
  return [...new Set(keys)];
}

export async function findExistingByDedupeKeys(vaultRoot, dedupeKeys) {
  const index = await readDedupeIndex(vaultRoot);
  for (const key of dedupeKeys) {
    if (index.dedupeKeys?.[key]) {
      return { key, entry: index.dedupeKeys[key] };
    }
  }
  return null;
}

export async function recordDedupeKeys(vaultRoot, dedupeKeys, entry) {
  const index = await readDedupeIndex(vaultRoot);
  index.dedupeKeys ||= {};
  for (const key of dedupeKeys) {
    index.dedupeKeys[key] = entry;
  }
  await writeDedupeIndex(vaultRoot, index);
}

export async function updateSourceAndRoutingIndexes({ vaultRoot, item, classification, canonicalId, dedupeKeys, now = new Date() }) {
  const sourceIndex = await readSystemIndex(vaultRoot, 'source-index.json', { sources: {}, bundles: {} });
  sourceIndex.sources ||= {};
  sourceIndex.bundles ||= {};

  const sourceRecord = {
    id: canonicalId,
    source: item.source,
    source_id: item.source_id,
    url: item.url,
    title: item.title,
    author: item.author,
    author_handle: item.author_handle,
    created_at: item.created_at,
    captured_at: item.captured_at,
    raw_path: item.raw?.path || '',
    content_hash: item.raw?.content_hash || '',
    clean_content_hash: item.raw?.clean_content_hash || '',
    dedupe_keys: dedupeKeys,
    bundle_id: item.bundle_id || '',
    linked_urls: item.linked_urls || [],
    parent_url: item.parent_url || '',
    role: item.role || '',
    updated_at: now.toISOString()
  };
  sourceIndex.sources[canonicalId] = sourceRecord;

  const bundleId = item.bundle_id || detectBundleId(item);
  if (bundleId) {
    const bundle = sourceIndex.bundles[bundleId] || {
      id: bundleId,
      source_ids: [],
      discovery_source_ids: [],
      child_source_ids: [],
      linked_urls: [],
      updated_at: now.toISOString()
    };
    addUnique(bundle.source_ids, canonicalId);
    if (item.role === 'discovery' || item.linked_urls?.length > 0) {
      addUnique(bundle.discovery_source_ids, canonicalId);
    }
    if (item.role === 'main_source' || item.parent_url) {
      addUnique(bundle.child_source_ids, canonicalId);
    }
    for (const url of item.linked_urls || []) {
      addUnique(bundle.linked_urls, url);
    }
    bundle.updated_at = now.toISOString();
    sourceIndex.bundles[bundleId] = bundle;
  }

  await writeSystemIndex(vaultRoot, 'source-index.json', sourceIndex);

  const info = topicInfo(classification.topic);
  const priority = priorityFor(classification);
  const routingIndex = await readSystemIndex(vaultRoot, 'routing-index.json', { entries: {} });
  routingIndex.entries ||= {};
  routingIndex.entries[canonicalId] = {
    source_id: canonicalId,
    title: item.title,
    source: item.source,
    source_url: item.url || '',
    raw_path: item.raw?.path || '',
    topic: classification.topic,
    topic_display: info.display,
    topic_page: info.page,
    timeline: info.timeline,
    discord_queue: priority === 'low' ? '' : info.queue,
    suggested_channel: info.channel,
    priority,
    entities: classification.entities || [],
    chains: classification.chains || [],
    tokens: classification.tokens || [],
    narratives: classification.narratives || [],
    relevance_score: classification.relevance_score,
    content_potential: classification.content_potential,
    created_at: item.created_at,
    ingested_at: now.toISOString()
  };
  await writeSystemIndex(vaultRoot, 'routing-index.json', routingIndex);

  await rebuildWikiProjections(vaultRoot);

  return {
    sourceRecord,
    routingRecord: routingIndex.entries[canonicalId]
  };
}

export async function rebuildWikiProjections(vaultRoot) {
  const safeVaultRoot = await ensureVaultStructure({ vaultRoot });
  const routingIndex = await readSystemIndex(safeVaultRoot, 'routing-index.json', { entries: {} });
  const entries = Object.values(routingIndex.entries || {});

  // Seam cut (DECISION #17): node emits mechanical projections only. Topic and
  // entity pages are agent-compiled judgment artifacts and are never node-written.
  await rebuildMechanicalProjections(safeVaultRoot, entries);
}

// Mechanical projections (node-owned per DECISION #17): date-sorted timelines and
// Discord queue drafts. No judgment required — safe to regenerate deterministically.
async function rebuildMechanicalProjections(vaultRoot, entries) {
  for (const topic of unique(entries.map((entry) => entry.topic))) {
    await writeTimeline(vaultRoot, topic, entries.filter((entry) => entry.topic === topic));
    await writeDiscordQueue(vaultRoot, topic, entries.filter((entry) => entry.topic === topic && entry.priority !== 'low'));
  }
}

export function canonicalSourceId(dedupeKeys) {
  return `src_${sha256(dedupeKeys[0] || crypto.randomUUID()).slice(0, 16)}`;
}

function buildRawSourceMarkdown(item, now) {
  return `---
type: raw_source
source: ${item.source || ''}
source_id: ${JSON.stringify(item.source_id || '')}
source_url: ${JSON.stringify(item.url || '')}
title: ${JSON.stringify(item.title || '')}
author: ${JSON.stringify(item.author || '')}
author_handle: ${JSON.stringify(item.author_handle || '')}
created_at: ${JSON.stringify(item.created_at || '')}
captured_at: ${JSON.stringify(item.captured_at || now.toISOString())}
---

# ${item.title || 'Raw Source'}

${item.text || ''}
`;
}

function enrichRawItem(item, { rawPath, relativePath, rawText }) {
  const cleanText = cleanForHash(item.text || rawText);
  return {
    ...item,
    source_id: item.source_id || relativePath,
    raw: {
      ...(item.raw || {}),
      path: relativePath,
      text: rawText,
      content_hash: sha256(rawText),
      clean_content_hash: sha256(cleanText)
    }
  };
}

async function writeTimeline(vaultRoot, topic, entries) {
  const info = topicInfo(topic);
  const targetPath = assertInside(vaultRoot, path.join(vaultRoot, info.timeline));
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  const ordered = sortEntries(entries);
  const markdown = `# ${info.display} Timeline

${ordered.map((entry) => `* ${isoDate(entry.created_at || entry.ingested_at)} — ${entry.title}. Sources: ${sourceLink(entry)}`).join('\n') || '* No timeline entries yet.'}
`;
  await fs.writeFile(targetPath, markdown, 'utf8');
}

async function writeDiscordQueue(vaultRoot, topic, entries) {
  const info = topicInfo(topic);
  const targetPath = assertInside(vaultRoot, path.join(vaultRoot, info.queue));
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  const ordered = sortEntries(entries);
  const markdown = ordered.map((entry) => `## ${isoDate(entry.created_at || entry.ingested_at)} — ${entry.title}

Status: pending
Priority: ${entry.priority}
Topic: ${info.display}
Suggested Discord Channel: ${info.channel}
Sources:

* ${sourceLink(entry)}

Suggested Message:
${entry.title}

Why It Matters:
${whyItMatters(entry)}
`).join('\n');
  await fs.writeFile(targetPath, markdown || `# ${info.display} Discord Queue\n\nNo pending queue items.\n`, 'utf8');
}

function sourceLink(entry) {
  return entry.raw_path ? `[[${entry.raw_path.replace(/\.md$/, '')}]]` : entry.source_url || entry.title;
}

function whyItMatters(entry) {
  const narratives = (entry.narratives || []).join(', ');
  return narratives ? `This signal touches ${narratives}.` : `This ${entry.topic_display || 'topic'} signal may be useful for a later brief.`;
}

function priorityFor(classification) {
  const score = Math.max(Number(classification.relevance_score || 0), Number(classification.content_potential || 0));
  if (score >= 75) return 'high';
  if (score >= 60) return 'medium';
  return 'low';
}

function detectBundleId(item) {
  if ((item.linked_urls || []).length === 0 && !item.parent_url) return '';
  return `bundle_${sha256([item.parent_url, item.url, ...(item.linked_urls || [])].filter(Boolean).sort().join('|')).slice(0, 16)}`;
}

function sortEntries(entries) {
  return [...entries].sort((a, b) => String(a.created_at || a.ingested_at).localeCompare(String(b.created_at || b.ingested_at)));
}

function cleanForHash(text) {
  return String(text || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function sha256(text) {
  return crypto.createHash('sha256').update(String(text)).digest('hex');
}

function isoDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }
  return date.toISOString().slice(0, 10);
}

function unique(values) {
  return [...new Set(values.filter(Boolean).map(String))];
}

function addUnique(list, value) {
  if (value && !list.includes(value)) {
    list.push(value);
  }
}
