// Single source of truth for topic routing (DECISION #18/#19).
//
// Before this module, topic definitions were hand-synced across classifier.js,
// wiki.js, writer.js, and config/topics.yaml — and had drifted: the classifier
// could emit 13 topic labels but wiki.js only mapped 7, so prediction_markets,
// dex_aggregators, defi, chains, ai, regulation, and infra silently fell back to
// the Crypto_Market_Structure catch-all. Everything topic-related now derives
// from the two exports below so the lists can never drift apart again.
//
// - TOPIC_RULES: ordered keyword rules (classifier). First match wins, so the
//   order encodes precedence (specific themes before generic ones). Each rule
//   routes to a `home` — the topic that owns a folder/timeline/queue/channel.
// - TOPIC_HOMES: one entry per home topic. Every rule.home MUST exist here; the
//   assertion at the bottom of this file fails fast if a rule points nowhere.

export const CATCH_ALL_TOPIC = 'crypto';

// Ordered — precedence matters. `home` is the topic that has a real place to
// land (see TOPIC_HOMES); `tags` keep the finer-grained label even when several
// rules share one home (e.g. dex_aggregators and defi both land in `defi`).
export const TOPIC_RULES = [
  { home: 'hyperliquid', tags: ['hyperliquid'], keywords: ['hyperliquid', 'hip-4', 'hip4', 'hyperevm'] },
  { home: 'tokenized_stocks', tags: ['tokenized_stocks', 'rwa'], keywords: ['tokenized stock', 'tokenized stocks', 'equity settlement', 'equities onchain'] },
  { home: 'stablecoins', tags: ['stablecoins', 'rwa'], keywords: ['stablecoin', 'stablecoins', 'usdc', 'usdt', 'rwa', 'treasury'] },
  { home: 'ai_agents', tags: ['ai_agents', 'ai'], keywords: ['ai agent', 'ai agents', 'agentic', 'autonomous agent'] },
  { home: 'wallets', tags: ['wallets'], keywords: ['wallet', 'wallets', 'smart account', 'embedded account', 'account abstraction'] },
  { home: 'prediction_markets', tags: ['prediction_markets'], keywords: ['prediction market', 'polymarket', 'kalshi'] },
  // dex_aggregators folds into DeFi — aggregators/intents/routing are a DeFi subtopic.
  { home: 'defi', tags: ['dex_aggregators', 'defi'], keywords: ['dex aggregator', 'aggregator', 'intents', 'routing'] },
  { home: 'defi', tags: ['defi'], keywords: ['defi', 'liquidity', 'yield', 'lending'] },
  // chains folds into Infrastructure — L1/L2s are "the rails".
  { home: 'infrastructure', tags: ['chains'], keywords: ['base', 'solana', 'bnb', 'megaeth', 'ethereum', 'chain'] },
  // ai folds into AI_Agents — don't split "AI" into two thin lanes.
  { home: 'ai_agents', tags: ['ai'], keywords: ['llm', 'model', 'inference', 'grok', 'openai', 'anthropic', 'research'] },
  // regulation folds into Crypto_Market_Structure — cross-cutting and thin.
  { home: 'crypto', tags: ['regulation'], keywords: ['sec', 'cftc', 'regulation', 'regulated', 'compliance'] },
  { home: 'infrastructure', tags: ['infra'], keywords: ['infrastructure', 'middleware', 'node', 'validator'] },
  { home: 'crypto', tags: ['crypto'], keywords: ['crypto', 'token', 'protocol', 'onchain'] }
];

// One entry per home topic. `slug` is the folder name under 10_Topics and the
// stem for the timeline; `channel`/`queueFile` drive the Discord projections.
const HOME_DEFS = [
  { key: 'hyperliquid', display: 'Hyperliquid', slug: 'Hyperliquid', channel: 'hyperliquid', queueFile: 'hyperliquid.md' },
  { key: 'ai_agents', display: 'AI Agents', slug: 'AI_Agents', channel: 'ai-agent', queueFile: 'ai-agent.md' },
  { key: 'tokenized_stocks', display: 'Tokenized Stocks', slug: 'Tokenized_Stocks', channel: 'tokenized-stocks', queueFile: 'tokenized-stocks.md' },
  { key: 'stablecoins', display: 'Stablecoins RWA', slug: 'Stablecoins_RWA', channel: 'stablecoins-rwa', queueFile: 'stablecoins-rwa.md' },
  { key: 'wallets', display: 'Wallets', slug: 'Wallets', channel: 'wallet-strategy', queueFile: 'wallet-strategy.md' },
  { key: 'prediction_markets', display: 'Prediction Markets', slug: 'Prediction_Markets', channel: 'prediction-markets', queueFile: 'prediction-markets.md' },
  { key: 'defi', display: 'DeFi', slug: 'DeFi', channel: 'defi', queueFile: 'defi.md' },
  { key: 'infrastructure', display: 'Infrastructure', slug: 'Infrastructure', channel: 'infrastructure', queueFile: 'infrastructure.md' },
  { key: 'crypto', display: 'Crypto Market Structure', slug: 'Crypto_Market_Structure', channel: 'crypto-market-structure', queueFile: 'crypto-market-structure.md' }
];

function projectHome({ key, display, slug, channel, queueFile }) {
  return {
    key,
    display,
    folder: `10_Topics/${slug}`,
    page: `10_Topics/${slug}/${slug}.md`,
    timeline: `30_Timelines/${slug}.md`,
    queue: `60_Discord_Queues/${queueFile}`,
    channel
  };
}

export const TOPIC_HOMES = Object.fromEntries(
  HOME_DEFS.map((def) => [def.key, projectHome(def)])
);

// Topic subfolders under 10_Topics/, derived so writer.js never re-lists them.
export const TOPIC_FOLDERS = HOME_DEFS.map((def) => `10_Topics/${def.slug}`);

// Fail fast at import time if a rule routes to a home that does not exist.
for (const rule of TOPIC_RULES) {
  if (!TOPIC_HOMES[rule.home]) {
    throw new Error(`topics.js: rule keyword(s) ${rule.keywords.join('/')} route to unknown home "${rule.home}"`);
  }
}

export function topicInfo(topic) {
  return TOPIC_HOMES[topic] || TOPIC_HOMES[CATCH_ALL_TOPIC];
}
