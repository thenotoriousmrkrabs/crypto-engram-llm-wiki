import process from 'node:process';
import { OpenNewsMCPAdapter } from '../src/main/adapters/opennews-mcp-adapter.js';
import { runPullJob } from '../src/main/firehose/pull-job.js';
import { defaultColdStoreRoot } from '../src/main/firehose/cold-store.js';

// One manual pull tick: 6551 -> cold store. Items land OUTSIDE the vault;
// only the explicit promote step moves one into 00_Inbox (#12). This script
// needs only OPENNEWS_TOKEN — Discord vars are the bot's concern.

const token = String(process.env.OPENNEWS_TOKEN || '').trim();
if (!token) {
  console.error('OPENNEWS_TOKEN is required. Copy .env.example to .env and fill it in,');
  console.error('then run: npm run ingest:opennews');
  process.exit(1);
}

const adapter = new OpenNewsMCPAdapter({ token });
const result = await runPullJob({ adapter });

console.log(`opennews pull: fetched ${result.fetched}, new ${result.newItems.length}, already seen ${result.skipped}`);
for (const item of result.newItems) {
  console.log(`  + [${item.source_id}] ${item.title}`);
}
console.log(`cold store: ${defaultColdStoreRoot()}/opennews (outside the vault — promote to enter the wiki, #12)`);
