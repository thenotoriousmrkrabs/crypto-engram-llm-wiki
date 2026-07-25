// Thin 6551 REST client for opentwitter pull (issue #3 commit 15; contract
// verified against 6551Team/opentwitter-mcp src: Bearer auth,
// POST /open/twitter_user_tweets with a JSON body, response { data: [...] }).
// fetch is injectable so the suite never touches the network. The live
// watch-push (twitter_wss) stays deferred to Hermes (#25).

import { OPENNEWS_API_BASE } from './opennews-client.js';

export const USER_TWEETS_ENDPOINT = '/open/twitter_user_tweets';

export async function fetchUserTweets({
  token,
  username,
  maxResults = 20,
  apiBase = OPENNEWS_API_BASE,
  fetchImpl = fetch
} = {}) {
  if (!String(token || '').trim()) {
    throw new Error('fetchUserTweets requires a 6551 bearer token');
  }
  if (!String(username || '').trim()) {
    throw new Error('fetchUserTweets requires a username');
  }

  const response = await fetchImpl(new URL(USER_TWEETS_ENDPOINT, apiBase).toString(), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      username: String(username).trim(),
      maxResults,
      product: 'Latest',
      includeReplies: false,
      includeRetweets: false
    })
  });

  if (!response.ok) {
    throw new Error(`6551 request failed: ${response.status} ${USER_TWEETS_ENDPOINT}`);
  }

  const payload = await response.json();
  if (!Array.isArray(payload?.data)) {
    throw new Error('6551 twitter_user_tweets response has no data array');
  }
  return payload.data;
}
