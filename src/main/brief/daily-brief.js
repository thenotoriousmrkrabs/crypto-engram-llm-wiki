import fs from 'node:fs/promises';
import path from 'node:path';
import { formatFrontmatter } from '../utils/frontmatter.js';
import { assertInside, toVaultRelative } from '../utils/paths.js';
import { ensureVaultStructure, readSystemIndex } from '../obsidian/writer.js';

export async function generateDailyBrief({ vaultRoot, date = isoDate(new Date()), now = new Date() }) {
  const safeVaultRoot = await ensureVaultStructure({ vaultRoot });
  const routingIndex = await readSystemIndex(safeVaultRoot, 'routing-index.json', { entries: {} });
  const sourceIndex = await readSystemIndex(safeVaultRoot, 'source-index.json', { sources: {}, bundles: {} });
  const entries = Object.values(routingIndex.entries || {})
    .filter((entry) => String(entry.ingested_at || '').startsWith(date))
    .sort((a, b) => String(a.created_at || a.ingested_at).localeCompare(String(b.created_at || b.ingested_at)));

  const briefPath = assertInside(
    safeVaultRoot,
    path.join(safeVaultRoot, '40_Synthesis', `${date}-daily-brief.md`)
  );
  const markdown = await buildDailyBriefMarkdown({ vaultRoot: safeVaultRoot, entries, sourceIndex, date, now });
  await fs.writeFile(briefPath, markdown, 'utf8');

  return {
    path: briefPath,
    relativePath: toVaultRelative(safeVaultRoot, briefPath),
    sourceCount: entries.length
  };
}

async function buildDailyBriefMarkdown({ vaultRoot, entries, sourceIndex, date, now }) {
  const frontmatter = formatFrontmatter({
    type: 'daily_brief',
    date,
    generated_at: now.toISOString(),
    source_count: entries.length,
    status: 'draft',
    reads_from: ['.system/source-index.json', '.system/routing-index.json', '10_Topics', '30_Timelines', '60_Discord_Queues']
  });

  const topicPages = unique(entries.map((entry) => entry.topic_page).filter(Boolean));
  const timelines = unique(entries.map((entry) => entry.timeline).filter(Boolean));
  const queues = unique(entries.map((entry) => entry.discord_queue).filter(Boolean));
  const bundles = Object.values(sourceIndex.bundles || {}).filter((bundle) => {
    return (bundle.source_ids || []).some((id) => entries.some((entry) => entry.source_id === id || entry.canonical_id === id));
  });

  return `${frontmatter}
# Daily Crypto + AI Intelligence Brief

## Executive Summary

${entries.length === 0 ? 'No routed source items were processed today.' : `${entries.length} routed source items were processed today. This brief is generated from system indexes, topic pages, timelines, and Discord queues.`}

## Topic Map

${formatPlainList(topicPages.map((page) => `[[${page.replace(/\.md$/, '')}]]`))}

## Top Signals

${formatEntryList(entries.filter((entry) => entry.priority === 'high')) || formatEntryList(entries.slice(-5).reverse())}

## Medium Priority Queue

${formatEntryList(entries.filter((entry) => entry.priority === 'medium'))}

## Source Bundles

${formatPlainList(bundles.map((bundle) => `${bundle.id}: ${(bundle.source_ids || []).length} linked sources`))}

## Timelines Updated

${formatPlainList(timelines.map((timeline) => `[[${timeline.replace(/\.md$/, '')}]]`))}

## Discord Queues

${formatPlainList(queues.map((queue) => `[[${queue.replace(/\.md$/, '')}]]`))}

## Sources Processed

${formatEntryList(entries)}
`;
}

function formatEntryList(entries) {
  if (!entries || entries.length === 0) {
    return '- None.';
  }
  return entries
    .map((entry) => `- ${entry.title} (${entry.topic_display || entry.topic}, ${entry.priority}). Source: [[${String(entry.raw_path || '').replace(/\.md$/, '')}]]`)
    .join('\n');
}

function formatPlainList(items) {
  const uniqueItems = unique(items);
  if (uniqueItems.length === 0) {
    return '- None.';
  }
  return uniqueItems.map((item) => `- ${item}`).join('\n');
}

function unique(values) {
  return [...new Set(values.filter(Boolean).map(String))];
}

function isoDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }
  return date.toISOString().slice(0, 10);
}
