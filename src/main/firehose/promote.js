import { defaultColdStoreRoot, readItem } from './cold-store.js';
import { StaticSourceAdapter } from '../adapters/source-item.js';
import { ingestFromAdapter } from '../ingestion/pipeline.js';

// The promote step (issue #3 commit 11) — the ONLY path that crosses
// firehose -> wiki (#12). A human tap names one cold-store item; it is
// handed to the existing tested ingestion pipeline via a one-item static
// adapter, landing as raw evidence in 00_Inbox (deduped, logged, projected)
// exactly like every other ingested source.

export async function promoteItem({
  vaultRoot,
  source,
  id,
  coldStoreRoot = defaultColdStoreRoot(),
  now = new Date()
}) {
  const item = await readItem({ root: coldStoreRoot, source, id });
  if (!item) {
    throw new Error(`cold store has no item ${source}:${id}`);
  }

  const adapter = new StaticSourceAdapter({ source: item.source || source, items: [item] });
  const result = await ingestFromAdapter({ adapter, vaultRoot, now });

  return {
    promoted: result.ingested.length === 1,
    duplicate: result.duplicates.length === 1,
    rawPath: result.ingested[0]?.path || result.duplicates[0]?.existing?.raw_path || '',
    result
  };
}

// Batch promote — the summary-channel path (replaces per-message 💾): a human
// multi-selects items from one summary, and all of them cross the firehose->wiki
// gate in one action. Each ref is promoted independently so one bad/unknown id
// (or a mid-batch dedupe) never aborts the rest; the caller reports per item.
export async function promoteItems({
  vaultRoot,
  refs = [],
  coldStoreRoot = defaultColdStoreRoot(),
  now = new Date()
}) {
  const results = [];
  const seen = new Set();
  for (const ref of refs) {
    const source = ref.source;
    const id = String(ref.id);
    const key = `${source}:${id}`;
    if (seen.has(key)) {
      continue; // the same item picked twice in one selection promotes once
    }
    seen.add(key);
    try {
      const one = await promoteItem({ vaultRoot, source, id, coldStoreRoot, now });
      results.push({ source, id, promoted: one.promoted, duplicate: one.duplicate, rawPath: one.rawPath });
    } catch (error) {
      results.push({ source, id, promoted: false, duplicate: false, rawPath: '', error: error.message });
    }
  }
  return {
    results,
    promoted: results.filter((result) => result.promoted).length,
    duplicate: results.filter((result) => result.duplicate).length,
    failed: results.filter((result) => result.error).length
  };
}
