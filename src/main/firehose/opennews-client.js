// Thin 6551 REST client for opennews (issue #3 commit 3; contract verified
// against 6551Team/opennews-mcp src: Bearer auth, GET /open/news_search,
// response shape { data: [...], total }).
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

  const url = new URL(endpoint, apiBase);
  for (const [name, value] of Object.entries(params)) {
    if (value === undefined || value === null || String(value) === '') {
      continue;
    }
    url.searchParams.set(name, String(value));
  }

  const response = await fetchImpl(url.toString(), {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`6551 request failed: ${response.status} ${endpoint}`);
  }

  return response.json();
}

export async function fetchLatestNews({ token, limit = 100, apiBase, fetchImpl } = {}) {
  const payload = await fetchOpenNewsJson({
    token,
    endpoint: NEWS_SEARCH_ENDPOINT,
    params: { limit, page: 1 },
    apiBase,
    fetchImpl
  });

  if (!Array.isArray(payload?.data)) {
    throw new Error('6551 news_search response has no data array');
  }
  return payload.data;
}
