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
