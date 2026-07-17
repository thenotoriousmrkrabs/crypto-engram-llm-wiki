import { generateDailyBrief } from '../src/main/brief/daily-brief.js';
import { getVaultRoot } from '../src/main/utils/config.js';

const vaultRoot = getVaultRoot();
const brief = await generateDailyBrief({ vaultRoot });
console.log(`Daily brief generated: ${brief.relativePath}`);
