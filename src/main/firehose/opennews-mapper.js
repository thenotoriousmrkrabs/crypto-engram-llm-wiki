// Pure mapper: one 6551 article -> one SourceItem-shaped object (issue #3
// commit 4). The full article is preserved under raw — including coins and
// aiRating (score/signal/grade) for later confidence use — and is never
// written as a page field (#10 amendment / #24).

export function mapArticleToSourceItem(article = {}) {
  const text = String(article.text || '').trim();
  return {
    source: 'opennews',
    source_id: article.id === undefined || article.id === null ? '' : String(article.id),
    url: String(article.link || ''),
    title: text || 'Untitled opennews item',
    text,
    created_at: toIsoDate(article.ts),
    tags: ['opennews', article.engineType, article.newsType]
      .filter((tag) => typeof tag === 'string' && tag.trim() !== ''),
    raw: article
  };
}

function toIsoDate(ts) {
  if (typeof ts !== 'number' || !Number.isFinite(ts)) {
    return '';
  }
  const date = new Date(ts);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
}
