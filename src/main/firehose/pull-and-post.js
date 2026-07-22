import { runPullJob } from './pull-job.js';
import { postItems } from './discord-poster.js';
import { keepByLang } from './text-clean.js';

// One full firehose tick (issue #3 commit 10): pull -> cold store -> post
// only the never-seen-before items to the reading channel. Dedupe holds
// through the whole chain because the cold store is the seen-set.
//
// Language gate is a POST filter, not a store filter: unreadable-language
// items are still written to the cold store (so they count as seen and are
// never re-fetched), they just never reach the reading channel.

export async function runPullAndPost({ adapter, coldStoreRoot, channel, langs }) {
  const result = await runPullJob({ adapter, coldStoreRoot });
  const langSet = langs ? new Set(langs) : null;
  const toPost = langSet
    ? result.newItems.filter((item) => keepByLang(item, langSet))
    : result.newItems;
  const { posted } = await postItems({ channel, items: toPost });
  return { ...result, posted, skippedLang: result.newItems.length - toPost.length };
}
