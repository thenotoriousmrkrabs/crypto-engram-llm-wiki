// One-time vault reorg for DECISION #18 (folder layout).
// - Archives legacy v1 drift folders into 90_Archive/Legacy_V1_Folders/ (reversible move, never delete).
// - Scaffolds the firehose/ cold store OUTSIDE the vault (project-level sibling), stored-not-indexed (#11/#12).
// - Ensures firehose/ is gitignored.
// Idempotent: re-running skips anything already moved/created. Never touches 00_Inbox raw evidence.

import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import { PROJECT_ROOT, assertInside, toVaultRelative } from '../src/main/utils/paths.js';
import { getVaultRoot } from '../src/main/utils/config.js';

const LEGACY_FOLDERS = [
  '.ingestion',
  '10_Daily_Briefs',
  '40_Narrative_Briefs',
  '50_Content_Drafts',
  '60_Prompt_Rules',
  '70_Performance'
];

async function archiveLegacyFolders(vaultRoot) {
  const archiveRoot = assertInside(vaultRoot, path.join(vaultRoot, '90_Archive', 'Legacy_V1_Folders'));
  await fs.mkdir(archiveRoot, { recursive: true });

  for (const folder of LEGACY_FOLDERS) {
    const source = assertInside(vaultRoot, path.join(vaultRoot, folder));
    if (!fsSync.existsSync(source)) {
      continue;
    }
    const target = assertInside(archiveRoot, path.join(archiveRoot, folder));
    if (fsSync.existsSync(target)) {
      console.log(`skip  ${folder} (already archived)`);
      continue;
    }
    await fs.rename(source, target);
    console.log(`moved ${folder} -> ${toVaultRelative(vaultRoot, target)}`);
  }
}

async function scaffoldFirehose() {
  const firehoseRoot = assertInside(PROJECT_ROOT, path.join(PROJECT_ROOT, 'firehose'));
  await fs.mkdir(firehoseRoot, { recursive: true });

  const readmePath = assertInside(firehoseRoot, path.join(firehoseRoot, 'README.md'));
  if (!fsSync.existsSync(readmePath)) {
    await fs.writeFile(readmePath, `# Firehose Cold Store (stored, not indexed)

The continuous MCP news/info stream lands here for recovery only (DECISION #12).
It lives OUTSIDE the Obsidian vault so firehose volume never bloats the curated KB
or its backups. Nothing here is part of the retrieval surface (#11): the wiki only
reads what has been compiled and listed in the vault's index.md. Items are promoted
into the vault by human save (#12), which fetches the ORIGINAL raw into 00_Inbox.
`, 'utf8');
    console.log('created firehose/README.md');
  } else {
    console.log('skip  firehose/README.md (exists)');
  }
}

async function ensureGitignore() {
  const gitignorePath = assertInside(PROJECT_ROOT, path.join(PROJECT_ROOT, '.gitignore'));
  let content = fsSync.existsSync(gitignorePath) ? await fs.readFile(gitignorePath, 'utf8') : '';
  const lines = content.split('\n').map((line) => line.trim());
  if (!lines.includes('firehose/')) {
    content = `${content.replace(/\n*$/, '')}\nfirehose/\n`;
    await fs.writeFile(gitignorePath, content, 'utf8');
    console.log('added firehose/ to .gitignore');
  } else {
    console.log('skip  .gitignore (firehose/ already ignored)');
  }
}

const vaultRoot = getVaultRoot();
console.log(`vault: ${vaultRoot}`);
await archiveLegacyFolders(vaultRoot);
await scaffoldFirehose();
await ensureGitignore();
console.log('reorg complete');
