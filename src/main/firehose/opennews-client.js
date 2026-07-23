// Thin 6551 REST client for opennews (issue #3 commit 3; contract verified
// 2026-07-21 against 6551Team/opennews-mcp src/opennews_mcp/api_client.py:
// Bearer auth, POST /open/news_search with a JSON body, response shape
// { data: [...], total }). The ai.6551.io gateway returns 404 (not 405) for
// the wrong method, so a GET here surfaced as a 404 on the path.
// fetch is injectable so the suite never touches the network.

export const OPENNEWS_API_BASE = 'https://ai.6551.io';
export const NEWS_SEARCH_ENDPOINT = '/open/news_search';

export async function fetchOpenNewsJson({
  token,
  endpoint,
  params = {},
  apiBase = OPENNEWS_API_BASE,
  fetchImpl = fetch
}) {
  if (!String(token || '').trim()) {
    throw new Error('fetchOpenNewsJson requires a 6551 bearer token');
  }

  // Upstream takes search params in a JSON body, not the query string. Drop
  // undefined/null/'' but keep meaningful falsey values like 0 and false.
  const body = {};
  for (const [name, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') {
      continue;
    }
    body[name] = value;
  }

  const url = new URL(endpoint, apiBase);
  const response = await fetchImpl(url.toString(), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(`6551 request failed: ${response.status} ${endpoint}${await responsePreview(response)}`);
  }

  return response.json();
}

// Best-effort short preview of the server's error body to make 4xx/5xx
// debuggable. Never touches headers/token; a body that can't be read just
// yields no preview rather than masking the original status.
async function responsePreview(response) {
  try {
    const text = await response.text();
    const trimmed = String(text || '').trim();
    if (!trimmed) {
      return '';
    }
    return ` — ${trimmed.length > 200 ? `${trimmed.slice(0, 200)}…` : trimmed}`;
  } catch {
    return '';
  }
}

export async function fetchLatestNews({ token, limit = 100, score = 0, coins, q, page = 1, apiBase, fetchImpl } = {}) {
  const payload = await fetchOpenNewsJson({
    token,
    endpoint: NEWS_SEARCH_ENDPOINT,
    // score is the minimum aiRating floor; 0 means "no floor" so we omit it
    // (fetchOpenNewsJson keeps a meaningful 0, so drop it here explicitly).
    // coins narrows to articles tagged to those tickers; q is a single full-text
    // theme string. Each is one narrow pull; the adapter fans out and merges.
    // page walks the recency-sorted list newest->older (1-indexed) so the
    // adapter can reach back past the last tick's newest 100.
    params: {
      limit,
      page,
      score: score > 0 ? score : undefined,
      coins: coinsParam(coins),
      q: String(q || '').trim() || undefined
    },
    apiBase,
    fetchImpl
  });

  if (!Array.isArray(payload?.data)) {
    throw new Error('6551 news_search response has no data array');
  }
  return payload.data;
}

// The 6551 news_search `coins` field is a Go []string, so it must be a JSON
// array of tickers — a comma-joined string 400s. Return an array (or undefined
// when empty, so fetchOpenNewsJson drops it and no coins filter is sent).
function coinsParam(coins) {
  const list = (Array.isArray(coins) ? coins : [coins])
    .map((coin) => String(coin ?? '').trim())
    .filter(Boolean);
  return list.length ? list : undefined;
}
