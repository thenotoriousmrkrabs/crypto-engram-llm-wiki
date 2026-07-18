import { defaultColdStoreRoot, itemId, storeItems } from './cold-store.js';

// One pull tick (issue #3 commit 7): adapter -> cold store -> the items not
// seen before. The cold store's id set is the seen-set, so a re-run returns
// nothing new. No timer, no Discord here — callers decide what happens next.

export async function runPullJob({ adapter, coldStoreRoot = defaultColdStoreRoot() }) {
  const items = await adapter.fetch();
  const { stored, skipped } = await storeItems({
    root: coldStoreRoot,
    source: adapter.source,
    items
  });

  const storedIds = new Set(stored);
  return {
    source: adapter.source,
    fetched: items.length,
    skipped: skipped.length,
    newItems: items.filter((item) => storedIds.has(itemId(item)))
  };
}
