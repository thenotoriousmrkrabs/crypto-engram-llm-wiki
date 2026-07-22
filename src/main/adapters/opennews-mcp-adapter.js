import { fetchLatestNews } from '../firehose/opennews-client.js';
import { mapArticleToSourceItem } from '../firehose/opennews-mapper.js';
import { normalizeSourceItem } from './source-item.js';

// Real opennews adapter (issue #3 commit 5): composes the 6551 REST client
// and the article mapper behind the same fetch() contract every adapter
// shares. The client is injectable so tests never touch the network.
export class OpenNewsMCPAdapter {
  constructor({ token, limit = 100, minScore = 0, fetchLatest = fetchLatestNews } = {}) {
    this.source = 'opennews';
    this.token = token;
    this.limit = limit;
    this.minScore = minScore;
    this.fetchLatest = fetchLatest;
  }

  async fetch() {
    const articles = await this.fetchLatest({
      token: this.token,
      limit: this.limit,
      score: this.minScore
    });
    return articles.map((article) =>
      normalizeSourceItem(mapArticleToSourceItem(article), { source: this.source })
    );
  }
}
