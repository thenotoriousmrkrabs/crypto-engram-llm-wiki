import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import { replaceFrontmatter, splitFrontmatter } from '../utils/frontmatter.js';
import { PROJECT_ROOT, assertInside, toVaultRelative } from '../utils/paths.js';
import { TOPIC_FOLDERS } from '../config/topics.js';
import { TEMPLATE_CONTENT } from './templates.js';

export const REQUIRED_VAULT_FOLDERS = [
  '00_Inbox',
  '00_Inbox/X_Bookmarks',
  '00_Inbox/X_Watchlist',
  '00_Inbox/OpenNews',
  '00_Inbox/Daily_News',
  '00_Inbox/Web_Clipper',
  '00_Inbox/Web_Clipper/_Raw_Drops',
  '00_Inbox/Manual_MD',
  '00_Inbox/Manual_MD/_Raw_Drops',
  '00_Inbox/Web_Articles',
  '05_Sources',
  '10_Topics',
  // Topic subfolders are derived from the single source of truth (config/topics.js)
  // so this list can never drift from the classifier's routing again.
  ...TOPIC_FOLDERS,
  '20_Entities',
  '20_Entities/People',
  '20_Entities/Protocols',
  '20_Entities/Companies',
  '20_Entities/Chains',
  '20_Entities/Tokens',
  '30_Timelines',
  '40_Synthesis',
  '50_Research_Answers',
  '60_Discord_Queues',
  '80_Templates',
  '90_Archive',
  '.system'
];

export const SOURCE_FOLDERS = {
  x_bookmarks: '00_Inbox/X_Bookmarks',
  x_watchlist: '00_Inbox/X_Watchlist',
  opennews: '00_Inbox/OpenNews',
  daily_news: '00_Inbox/Daily_News',
  web_clipper: '00_Inbox/Web_Clipper',
  manual_md: '00_Inbox/Manual_MD',
  web_articles: '00_Inbox/Web_Articles'
};

export async function ensureVaultStructure({ vaultRoot, projectRoot = PROJECT_ROOT } = {}) {
  const safeVaultRoot = assertInside(projectRoot, vaultRoot);

  for (const folder of REQUIRED_VAULT_FOLDERS) {
    const target = assertInside(safeVaultRoot, path.join(safeVaultRoot, folder));
    await fs.mkdir(target, { recursive: true });
  }

  for (const [fileName, content] of Object.entries(TEMPLATE_CONTENT)) {
    const target = assertInside(safeVaultRoot, path.join(safeVaultRoot, '80_Templates', fileName));
    if (!fsSync.existsSync(target)) {
      await fs.writeFile(target, content, 'utf8');
    }
  }

  const logPath = assertInside(safeVaultRoot, path.join(safeVaultRoot, '.system', 'ingest-log.jsonl'));
  if (!fsSync.existsSync(logPath)) {
    await fs.writeFile(logPath, '', 'utf8');
  }

  const indexPath = getDedupeIndexPath(safeVaultRoot);
  if (!fsSync.existsSync(indexPath)) {
    await writeDedupeIndex(safeVaultRoot, { dedupeKeys: {} });
  }

  for (const fileName of ['source-index.json', 'routing-index.json']) {
    const systemPath = getSystemIndexPath(safeVaultRoot, fileName);
    if (!fsSync.existsSync(systemPath)) {
      await writeSystemIndex(safeVaultRoot, fileName, {});
    }
  }

  await ensureWikiIndexFiles(safeVaultRoot);

  return safeVaultRoot;
}

async function ensureWikiIndexFiles(vaultRoot) {
  const files = [
    ['index.md', `# Wiki Index

The retrieval entry point. One row per compiled wiki page (path | summary | tags).

| Path | Summary | Tags |
| --- | --- | --- |
`],
    ['log.md', `# Log

Append-only record of ingests, compiles, queries, and lints.
`]
  ];

  for (const [fileName, content] of files) {
    const target = assertInside(vaultRoot, path.join(vaultRoot, fileName));
    if (!fsSync.existsSync(target)) {
      await fs.writeFile(target, content, 'utf8');
    }
  }
}

export async function archiveLegacyNormalizedInboxNotes({ vaultRoot }) {
  const safeVaultRoot = await ensureVaultStructure({ vaultRoot });
  const inboxRoot = assertInside(safeVaultRoot, path.join(safeVaultRoot, '00_Inbox'));
  const legacyTypes = new Set([
    'x_bookmark',
    'x_watchlist',
    'opennews_item',
    'daily_news_item',
    'manual_md',
    'web_clipper',
    'source_note'
  ]);
  const archived = [];

  for await (const notePath of walkMarkdownFiles(inboxRoot)) {
    if (notePath.includes(`${path.sep}_Raw_Drops${path.sep}`)) {
      continue;
    }

    const markdown = await fs.readFile(notePath, 'utf8');
    const { frontmatter } = splitFrontmatter(markdown);
    if (!legacyTypes.has(frontmatter.type) || !frontmatter.dedupe_key) {
      continue;
    }

    const relative = toVaultRelative(safeVaultRoot, notePath);
    const archivePath = assertInside(
      safeVaultRoot,
      path.join(safeVaultRoot, '90_Archive', 'Legacy_Normalized_Inbox', relative)
    );
    await fs.mkdir(path.dirname(archivePath), { recursive: true });
    if (!fsSync.existsSync(archivePath)) {
      await fs.rename(notePath, archivePath);
      archived.push({ from: relative, to: toVaultRelative(safeVaultRoot, archivePath) });
    }
  }

  return archived;
}

export async function createNoteFromTemplate({ vaultRoot, templateName, relativePath, replacements = {} }) {
  const safeVaultRoot = await ensureVaultStructure({ vaultRoot });
  const templatePath = assertInside(safeVaultRoot, path.join(safeVaultRoot, '80_Templates', templateName));
  const targetPath = assertInside(safeVaultRoot, path.join(safeVaultRoot, relativePath));
  let content = await fs.readFile(templatePath, 'utf8');

  for (const [key, value] of Object.entries(replacements)) {
    content = content.replaceAll(`{{${key}}}`, String(value ?? ''));
  }

  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.writeFile(targetPath, content, 'utf8');
  return {
    path: targetPath,
    relativePath: toVaultRelative(safeVaultRoot, targetPath)
  };
}

export async function findExistingByDedupeKey({ vaultRoot, dedupeKey }) {
  const safeVaultRoot = await ensureVaultStructure({ vaultRoot });
  const index = await readDedupeIndex(safeVaultRoot);
  const indexed = index.dedupeKeys?.[dedupeKey];
  if (indexed) {
    return indexed;
  }

  for await (const notePath of walkMarkdownFiles(safeVaultRoot)) {
    if (notePath.includes(`${path.sep}80_Templates${path.sep}`)) {
      continue;
    }
    const markdown = await fs.readFile(notePath, 'utf8');
    const { frontmatter } = splitFrontmatter(markdown);
    if (frontmatter.dedupe_key === dedupeKey) {
      return {
        path: toVaultRelative(safeVaultRoot, notePath),
        source: frontmatter.source || '',
        discovered_by: 'frontmatter_scan'
      };
    }
  }

  return null;
}

export async function updateFrontmatter({ vaultRoot, notePath, updates }) {
  const safeVaultRoot = await ensureVaultStructure({ vaultRoot });
  const targetPath = path.isAbsolute(notePath) ? notePath : path.join(safeVaultRoot, notePath);
  const safeNotePath = assertInside(safeVaultRoot, targetPath);
  const current = await fs.readFile(safeNotePath, 'utf8');
  await fs.writeFile(safeNotePath, replaceFrontmatter(current, updates), 'utf8');
  return {
    path: safeNotePath,
    relativePath: toVaultRelative(safeVaultRoot, safeNotePath)
  };
}

export function safeFileName(input, fallback = 'untitled') {
  const cleaned = String(input || fallback)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, ' ')
    .replace(/[^\w .@+-]+/g, ' ')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/-\./g, '.')
    .replace(/^\.+/, '')
    .replace(/^-|-$/g, '')
    .slice(0, 120);

  return cleaned || fallback;
}

export async function upsertIndexRows({ vaultRoot, rows }) {
  const safeVaultRoot = await ensureVaultStructure({ vaultRoot });
  const indexPath = assertInside(safeVaultRoot, path.join(safeVaultRoot, 'index.md'));
  const current = await fs.readFile(indexPath, 'utf8');
  const lines = current.replace(/\n+$/, '').split('\n');

  for (const row of rows) {
    if (!row?.path) {
      continue;
    }
    const line = `| ${row.path} | ${row.summary || ''} | ${(row.tags || []).join(', ')} |`;
    const existing = lines.findIndex((candidate) => candidate.startsWith(`| ${row.path} |`));
    if (existing === -1) {
      lines.push(line);
    } else {
      lines[existing] = line;
    }
  }

  await fs.writeFile(indexPath, `${lines.join('\n')}\n`, 'utf8');
  return {
    path: indexPath,
    relativePath: toVaultRelative(safeVaultRoot, indexPath)
  };
}

export async function appendWikiLog(vaultRoot, line) {
  const safeVaultRoot = await ensureVaultStructure({ vaultRoot });
  const logPath = assertInside(safeVaultRoot, path.join(safeVaultRoot, 'log.md'));
  await fs.appendFile(logPath, `${line}\n`, 'utf8');
  return {
    path: logPath,
    relativePath: toVaultRelative(safeVaultRoot, logPath)
  };
}

export async function appendIngestionLog(vaultRoot, entry) {
  const safeVaultRoot = await ensureVaultStructure({ vaultRoot });
  const logPath = assertInside(safeVaultRoot, path.join(safeVaultRoot, '.system', 'ingest-log.jsonl'));
  await fs.appendFile(logPath, `${JSON.stringify(entry)}\n`, 'utf8');
}

export async function readIngestionLog(vaultRoot) {
  const safeVaultRoot = await ensureVaultStructure({ vaultRoot });
  const logPath = assertInside(safeVaultRoot, path.join(safeVaultRoot, '.system', 'ingest-log.jsonl'));
  const content = await fs.readFile(logPath, 'utf8');
  return content
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

export function getDedupeIndexPath(vaultRoot) {
  const safeVaultRoot = assertInside(PROJECT_ROOT, vaultRoot);
  return assertInside(safeVaultRoot, path.join(safeVaultRoot, '.system', 'dedupe-index.json'));
}

export function getSystemIndexPath(vaultRoot, fileName) {
  const safeVaultRoot = assertInside(PROJECT_ROOT, vaultRoot);
  return assertInside(safeVaultRoot, path.join(safeVaultRoot, '.system', fileName));
}

export async function readDedupeIndex(vaultRoot) {
  const safeVaultRoot = assertInside(PROJECT_ROOT, vaultRoot);
  const indexPath = getDedupeIndexPath(safeVaultRoot);
  try {
    const parsed = JSON.parse(await fs.readFile(indexPath, 'utf8'));
    return parsed && parsed.dedupeKeys ? parsed : { dedupeKeys: {} };
  } catch (error) {
    if (error.code === 'ENOENT') {
      return { dedupeKeys: {} };
    }
    throw error;
  }
}

export async function writeDedupeIndex(vaultRoot, index) {
  const safeVaultRoot = assertInside(PROJECT_ROOT, vaultRoot);
  const indexPath = getDedupeIndexPath(safeVaultRoot);
  await fs.mkdir(path.dirname(indexPath), { recursive: true });
  await fs.writeFile(indexPath, `${JSON.stringify(index, null, 2)}\n`, 'utf8');
}

export async function updateDedupeIndex(vaultRoot, dedupeKey, entry) {
  const index = await readDedupeIndex(vaultRoot);
  index.dedupeKeys[dedupeKey] = entry;
  await writeDedupeIndex(vaultRoot, index);
}

export async function readSystemIndex(vaultRoot, fileName, fallback = {}) {
  const safeVaultRoot = assertInside(PROJECT_ROOT, vaultRoot);
  const indexPath = getSystemIndexPath(safeVaultRoot, fileName);
  try {
    return JSON.parse(await fs.readFile(indexPath, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') {
      return fallback;
    }
    throw error;
  }
}

export async function writeSystemIndex(vaultRoot, fileName, value) {
  const safeVaultRoot = assertInside(PROJECT_ROOT, vaultRoot);
  const indexPath = getSystemIndexPath(safeVaultRoot, fileName);
  await fs.mkdir(path.dirname(indexPath), { recursive: true });
  await fs.writeFile(indexPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

export async function readMarkdownNote(notePath) {
  return fs.readFile(notePath, 'utf8');
}

export async function* walkMarkdownFiles(root) {
  const entries = await fs.readdir(root, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      yield* walkMarkdownFiles(entryPath);
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      yield entryPath;
    }
  }
}
