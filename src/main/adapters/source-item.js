import { buildDedupeKey } from '../utils/dedupe.js';

export function normalizeSourceItem(rawItem, { source, capturedAt = new Date() } = {}) {
  const item = {
    source: rawItem.source || source || 'unknown',
    source_id: rawItem.source_id || '',
    url: rawItem.url || '',
    title: rawItem.title || 'Untitled source item',
    author: rawItem.author || '',
    author_handle: rawItem.author_handle || '',
    text: rawItem.text || '',
    created_at: rawItem.created_at || '',
    captured_at: rawItem.captured_at || capturedAt.toISOString(),
    media_urls: Array.isArray(rawItem.media_urls) ? rawItem.media_urls : [],
    tags: Array.isArray(rawItem.tags) ? rawItem.tags : [],
    raw: rawItem.raw || rawItem,
    dedupe_key: rawItem.dedupe_key || '',
    bundle_id: rawItem.bundle_id || rawItem.raw?.bundle_id || '',
    linked_urls: Array.isArray(rawItem.linked_urls) ? rawItem.linked_urls : (Array.isArray(rawItem.raw?.linked_urls) ? rawItem.raw.linked_urls : []),
    parent_url: rawItem.parent_url || rawItem.raw?.parent_url || '',
    role: rawItem.role || rawItem.raw?.role || ''
  };

  item.dedupe_key = item.dedupe_key || buildDedupeKey(item);
  return item;
}

export class StaticSourceAdapter {
  constructor({ source, items = [] }) {
    this.source = source;
    this.items = items;
  }

  async fetch() {
    return this.items.map((item) => normalizeSourceItem(item, { source: this.source }));
  }
}
