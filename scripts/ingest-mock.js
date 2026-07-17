import { MockAdapter } from '../src/main/adapters/mock-adapter.js';
import { ingestFromAdapter } from '../src/main/ingestion/pipeline.js';
import { getVaultRoot } from '../src/main/utils/config.js';

const vaultRoot = getVaultRoot();
const result = await ingestFromAdapter({
  adapter: new MockAdapter(),
  vaultRoot
});

console.log(`Mock ingestion complete: ${result.ingested.length} ingested, ${result.duplicates.length} duplicates, ${result.errors.length} errors`);
for (const note of result.ingested) {
  console.log(`created: ${note.relativePath}`);
}
for (const duplicate of result.duplicates) {
  console.log(`duplicate: ${duplicate.dedupe_key}`);
}
if (result.errors.length > 0) {
  process.exitCode = 1;
}
