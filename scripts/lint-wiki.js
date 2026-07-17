import { lintWiki } from '../src/main/obsidian/lint.js';
import { getVaultRoot } from '../src/main/utils/config.js';

const vaultRoot = getVaultRoot();
const violations = await lintWiki(vaultRoot);

if (violations.length === 0) {
  console.log('lint:wiki clean — all compiled pages satisfy the frontmatter contract.');
} else {
  console.error(`lint:wiki found ${violations.length} violation(s):`);
  for (const violation of violations) {
    console.error(`- ${violation.path} [${violation.rule}] ${violation.message}`);
  }
  process.exitCode = 1;
}
