import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import path from 'node:path';
import { normalizeSourceItem } from './source-item.js';
import { assertInside, toVaultRelative } from '../utils/paths.js';
import { normalizePart } from '../utils/dedupe.js';
import { splitFrontmatter } from '../utils/frontmatter.js';
import { firstMarkdownHeading } from '../utils/markdown.js';

export class FolderMarkdownAdapter {
  constructor({ source, vaultRoot, rawDropRelativePath }) {
    this.source = source;
    this.vaultRoot = vaultRoot;
    this.rawDropRelativePath = rawDropRelativePath;
  }

  async fetch() {
    const rawDropPath = assertInside(this.vaultRoot, path.join(this.vaultRoot, this.rawDropRelativePath));
    await fs.mkdir(rawDropPath, { recursive: true });
    const files = await listMarkdownFiles(rawDropPath);

    const items = [];
    for (const filePath of files) {
      const text = await fs.readFile(filePath, 'utf8');
      const relativePath = toVaultRelative(this.vaultRoot, filePath);
      const stat = await fs.stat(filePath);
      const metadata = parseMarkdownMetadata(text);
      const sourceUrl = metadata.Source || metadata.source || '';
      const authorHandle = extractAuthorHandle(text);
      const mainText = extractMainContent(text);
      const contentHash = sha256(text);
      items.push(normalizeSourceItem({
        source: this.source,
        source_id: relativePath,
        url: sourceUrl,
        title: extractBestTitle(text) || firstMarkdownHeading(text) || path.basename(filePath, '.md'),
        author_handle: authorHandle,
        text: mainText || text,
        created_at: parseExportDate(metadata['Created At'] || metadata.created || metadata.published) || stat.birthtime.toISOString(),
        captured_at: stat.mtime.toISOString(),
        tags: [this.source, ...metadataTags(metadata.tags)],
        dedupe_key: buildFileContentDedupeKey({
          source: this.source,
          relativePath,
          contentHash
        }),
        raw: {
          path: relativePath,
          content_hash: contentHash,
          metadata,
          text
        }
      }, { source: this.source }));
    }

    return items;
  }
}

export function buildFileContentDedupeKey({ source, relativePath, contentHash }) {
  return `${normalizePart(source)}:file:${normalizePart(relativePath)}:${contentHash}`;
}

export function parseMarkdownMetadata(markdown) {
  return {
    ...parseFrontmatterMetadata(markdown),
    ...parseFencedYamlMetadata(markdown)
  };
}

export function parseFrontmatterMetadata(markdown) {
  const { frontmatter } = splitFrontmatter(markdown);
  return frontmatter || {};
}

export function parseFencedYamlMetadata(markdown) {
  const match = markdown.match(/```ya?ml\s*\n([\s\S]*?)\n```/i);
  if (!match) {
    return {};
  }

  const metadata = {};
  for (const line of match[1].split('\n')) {
    const field = line.match(/^([^:]+):\s*(.*)$/);
    if (!field) {
      continue;
    }
    const key = field[1].trim();
    const value = field[2].trim().replace(/^["']|["']$/g, '');
    metadata[key] = value;
  }
  return metadata;
}

export function extractBestTitle(markdown) {
  const metadata = parseMarkdownMetadata(markdown);
  if (metadata.title) {
    return metadata.title;
  }

  const article = markdown.match(/^###\s+Article:\s*[:\s]*(.+)$/m);
  if (article) {
    return article[1].trim();
  }

  const headings = [...markdown.matchAll(/^#{1,3}\s+(.+)$/gm)]
    .map((match) => match[1].trim())
    .filter((heading) => {
      return !/^all exported content$/i.test(heading) &&
        !/^post( \d+)?$/i.test(heading) &&
        !/^conversation$/i.test(heading) &&
        !/^discover more$/i.test(heading);
    });

  return headings[0] || '';
}

export function extractAuthorHandle(markdown) {
  const match = markdown.match(/\bWritten by\s+@([A-Za-z0-9_\\-]+)/i);
  return match ? match[1].replace(/\\/g, '') : '';
}

export function extractMainContent(markdown) {
  return markdown
    .replace(/^---\n[\s\S]*?\n---\s*/i, '')
    .replace(/^#\s+All exported content\s*/i, '')
    .replace(/^##\s+Post\s+\d+\s*/im, '')
    .replace(/```ya?ml\s*\n[\s\S]*?\n```\s*/i, '')
    .trim();
}

export function parseExportDate(value) {
  if (!value) {
    return '';
  }

  const normalized = String(value)
    .trim()
    .replace(/^["']|["']$/g, '')
    .replace(/^(\d{4}-\d{2}-\d{2})_(\d{2})-(\d{2})-(\d{2})$/, '$1T$2:$3:$4.000Z');
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
}

function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function metadataTags(tags) {
  if (Array.isArray(tags)) {
    return tags.map(String);
  }
  if (!tags) {
    return [];
  }
  return [String(tags)];
}

async function listMarkdownFiles(root) {
  const entries = await fs.readdir(root, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const entryPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listMarkdownFiles(entryPath));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(entryPath);
    }
  }
  return files.sort();
}
