import { ManualMarkdownAdapter } from '../src/main/adapters/manual-markdown-adapter.js';
import { ingestFromAdapter } from '../src/main/ingestion/pipeline.js';
import { getVaultRoot } from '../src/main/utils/config.js';

const vaultRoot = getVaultRoot();
const adapter = new ManualMarkdownAdapter({ vaultRoot });
const result = await ingestFromAdapter({ adapter, vaultRoot });

console.log(`Manual Markdown ingestion complete: ${result.ingested.length} ingested, ${result.duplicates.length} duplicates, ${result.errors.length} errors`);
if (result.errors.length > 0) {
  process.exitCode = 1;
}
