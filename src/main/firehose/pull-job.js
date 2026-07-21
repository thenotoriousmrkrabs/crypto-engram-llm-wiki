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

  // `stored` holds each newly-written id once; two fetched items sharing an id
  // both match storedIds, so emit each id only the first time to avoid a
  // double post of a single cold-store write (#2).
  const storedIds = new Set(stored);
  const emitted = new Set();
  const newItems = [];
  for (const item of items) {
    const id = itemId(item);
    if (storedIds.has(id) && !emitted.has(id)) {
      emitted.add(id);
      newItems.push(item);
    }
  }

  return {
    source: adapter.source,
    fetched: items.length,
    skipped: skipped.length,
    newItems
  };
}
