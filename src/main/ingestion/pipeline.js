import { normalizeSourceItem } from '../adapters/source-item.js';
import { classifySourceItem } from './classifier.js';
import {
  appendIngestionLog,
  appendWikiLog,
  upsertIndexRows
} from '../obsidian/writer.js';
import {
  buildWikiDedupeKeys,
  canonicalSourceId,
  findExistingByDedupeKeys,
  recordDedupeKeys,
  saveOrPreserveRawSource,
  updateSourceAndRoutingIndexes
} from '../obsidian/wiki.js';

export async function ingestFromAdapter({ adapter, vaultRoot, now = new Date() }) {
  const fetchedItems = await adapter.fetch();
  const result = {
    source: adapter.source || 'unknown',
    ingested: [],
    duplicates: [],
    errors: []
  };

  for (const rawItem of fetchedItems) {
    let item = normalizeSourceItem(rawItem, {
      source: rawItem.source || adapter.source,
      capturedAt: now
    });

    try {
      item = await saveOrPreserveRawSource({ vaultRoot, item, now });
      const dedupeKeys = buildWikiDedupeKeys(item);
      item.dedupe_key = dedupeKeys[0] || item.dedupe_key;
      const existing = await findExistingByDedupeKeys(vaultRoot, dedupeKeys);

      if (existing) {
        const duplicate = {
          source: item.source,
          source_id: item.source_id,
          dedupe_key: item.dedupe_key,
          dedupe_keys: dedupeKeys,
          existing
        };
        result.duplicates.push(duplicate);
        await appendIngestionLog(vaultRoot, {
          event: 'skipped_duplicate',
          status: 'processed',
          source: item.source,
          source_id: item.source_id,
          dedupe_key: item.dedupe_key,
          dedupe_keys: dedupeKeys,
          raw_path: item.raw?.path || '',
          content_hash: item.raw?.content_hash || '',
          clean_content_hash: item.raw?.clean_content_hash || '',
          existing,
          processed_at: now.toISOString(),
          ingested_at: now.toISOString()
        });
        continue;
      }

      const classification = classifySourceItem(item);
      const canonicalId = canonicalSourceId(dedupeKeys);
      const projection = await updateSourceAndRoutingIndexes({
        vaultRoot,
        item,
        classification,
        canonicalId,
        dedupeKeys,
        now
      });

      await recordDedupeKeys(vaultRoot, dedupeKeys, {
        canonical_id: canonicalId,
        raw_path: item.raw?.path || '',
        source: item.source,
        source_id: item.source_id,
        raw_path: item.raw?.path || '',
        content_hash: item.raw?.content_hash || '',
        clean_content_hash: item.raw?.clean_content_hash || '',
        title: item.title,
        ingested_at: now.toISOString()
      });

      const routingRecord = projection.routingRecord;
      const indexRows = [{
        path: routingRecord.timeline,
        summary: `${routingRecord.topic_display} timeline`,
        tags: [routingRecord.topic]
      }];
      if (routingRecord.discord_queue) {
        indexRows.push({
          path: routingRecord.discord_queue,
          summary: `${routingRecord.topic_display} Discord queue drafts`,
          tags: [routingRecord.topic]
        });
      }
      await upsertIndexRows({ vaultRoot, rows: indexRows });
      await appendWikiLog(
        vaultRoot,
        `- ${now.toISOString()} — ingest: ${JSON.stringify(item.title || item.source_id || '')} → ${classification.topic} (${item.raw?.path || ''})`
      );

      const ingested = {
        path: item.raw?.path || '',
        relativePath: item.raw?.path || '',
        source: item.source,
        source_id: item.source_id,
        dedupe_key: item.dedupe_key,
        dedupe_keys: dedupeKeys,
        topic: classification.topic,
        canonical_id: canonicalId,
        topic_page: projection.routingRecord.topic_page,
        timeline: projection.routingRecord.timeline,
        discord_queue: projection.routingRecord.discord_queue
      };
      result.ingested.push(ingested);
      await appendIngestionLog(vaultRoot, {
        event: 'ingested',
        status: 'processed',
        source: item.source,
        source_id: item.source_id,
        dedupe_key: item.dedupe_key,
        dedupe_keys: dedupeKeys,
        raw_path: item.raw?.path || '',
        content_hash: item.raw?.content_hash || '',
        clean_content_hash: item.raw?.clean_content_hash || '',
        topic: classification.topic,
        canonical_id: canonicalId,
        topic_page: projection.routingRecord.topic_page,
        timeline: projection.routingRecord.timeline,
        discord_queue: projection.routingRecord.discord_queue,
        processed_at: now.toISOString(),
        ingested_at: now.toISOString()
      });
    } catch (error) {
      const failure = {
        source: item.source,
        source_id: item.source_id,
        dedupe_key: item.dedupe_key,
        message: error.message
      };
      result.errors.push(failure);
      await appendIngestionLog(vaultRoot, {
        event: 'error',
        status: 'error',
        ...failure,
        raw_path: item.raw?.path || '',
        content_hash: item.raw?.content_hash || '',
        ingested_at: now.toISOString()
      });
    }
  }

  return result;
}
