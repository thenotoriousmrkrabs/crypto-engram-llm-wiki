import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { PROJECT_ROOT, assertInside } from '../utils/paths.js';

// The firehose cold store (issue #3 commit 6; DECISIONS #12/#13/#25).
// Lives OUTSIDE the Obsidian vault (default: <project>/firehose, gitignored)
// so firehose items are stored but never enter the retrieval corpus. One JSON
// file per item, keyed by item id — idempotent, and the id set doubles as the
// pull job's seen-set. The only path from here into the wiki is the explicit
// human promote step (#12).

export function defaultColdStoreRoot() {
  return path.join(PROJECT_ROOT, 'firehose');
}

export async function storeItems({ root = defaultColdStoreRoot(), source, items = [] }) {
  const sourceDir = sourcePath(root, source);
  await fs.mkdir(sourceDir, { recursive: true });

  const stored = [];
  const skipped = [];
  for (const item of items) {
    const id = itemId(item);
    const filePath = path.join(sourceDir, itemFileName(id));
    if (fsSync.existsSync(filePath)) {
      skipped.push(id);
      continue;
    }
    await fs.writeFile(filePath, `${JSON.stringify(item, null, 2)}\n`, 'utf8');
    stored.push(id);
  }
  return { stored, skipped };
}

export async function readItem({ root = defaultColdStoreRoot(), source, id }) {
  const filePath = path.join(sourcePath(root, source), itemFileName(id));
  if (!fsSync.existsSync(filePath)) {
    return null;
  }
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

export function hasItem({ root = defaultColdStoreRoot(), source, id }) {
  return fsSync.existsSync(path.join(sourcePath(root, source), itemFileName(id)));
}

export function itemId(item) {
  const id = String(item.source_id || item.dedupe_key || '').trim();
  if (!id) {
    throw new Error('cold store item needs a source_id or dedupe_key');
  }
  return id;
}

function itemFileName(id) {
  const clean = String(id).trim();
  // Readable name for simple ids; hash anything that could escape or collide.
  if (/^[A-Za-z0-9_.-]{1,120}$/.test(clean) && !clean.startsWith('.')) {
    return `${clean}.json`;
  }
  return `${crypto.createHash('sha256').update(clean).digest('hex').slice(0, 32)}.json`;
}

function sourcePath(root, source) {
  if (!String(source || '').trim()) {
    throw new Error('cold store needs a source name');
  }
  return assertInside(PROJECT_ROOT, path.join(root, source));
}
