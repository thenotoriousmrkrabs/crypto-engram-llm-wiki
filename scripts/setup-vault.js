import { getVaultRoot } from '../src/main/utils/config.js';
import { archiveLegacyNormalizedInboxNotes, ensureVaultStructure } from '../src/main/obsidian/writer.js';

const vaultRoot = getVaultRoot();
await ensureVaultStructure({ vaultRoot });
const archived = await archiveLegacyNormalizedInboxNotes({ vaultRoot });
console.log(`Vault ready: ${vaultRoot}`);
if (archived.length > 0) {
  console.log(`Archived legacy normalized inbox notes: ${archived.length}`);
}
