import { runPullJob } from './pull-job.js';
import { postItems } from './discord-poster.js';

// One full firehose tick (issue #3 commit 10): pull -> cold store -> post
// only the never-seen-before items to the reading channel. Dedupe holds
// through the whole chain because the cold store is the seen-set.

export async function runPullAndPost({ adapter, coldStoreRoot, channel }) {
  const result = await runPullJob({ adapter, coldStoreRoot });
  const { posted } = await postItems({ channel, items: result.newItems });
  return { ...result, posted };
}
