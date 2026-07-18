import { fetchUserTweets } from '../firehose/opentwitter-client.js';
import { mapTweetToSourceItem } from '../firehose/opentwitter-mapper.js';
import { normalizeSourceItem } from './source-item.js';

// Real opentwitter pull adapter (issue #3 commit 15): recent tweets for the
// accounts on the watch list, same client/mapper pattern as opennews. An
// empty watch list yields an empty fetch — connect-now/populate-later by
// design (#25); Hermes owns the live watch-push later. The client is
// injectable so tests never touch the network.
export class OpenTwitterMCPAdapter {
  constructor({ token, usernames = [], maxResults = 20, fetchTweets = fetchUserTweets } = {}) {
    this.source = 'x_watchlist';
    this.token = token;
    this.usernames = usernames;
    this.maxResults = maxResults;
    this.fetchTweets = fetchTweets;
  }

  async fetch() {
    const items = [];
    for (const username of this.usernames) {
      const tweets = await this.fetchTweets({
        token: this.token,
        username,
        maxResults: this.maxResults
      });
      for (const tweet of tweets) {
        items.push(normalizeSourceItem(mapTweetToSourceItem(tweet, { username }), { source: this.source }));
      }
    }
    return items;
  }
}
