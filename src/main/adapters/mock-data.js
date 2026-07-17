export const mockSourceItems = [
  {
    source: 'x_bookmarks',
    source_id: 'x-hyperliquidr-almanack',
    url: 'https://x.com/HyperliquidR/status/2070408676620349676',
    title: 'HyperliquidR shares The Almanack of Hyperliquid',
    author: 'Hyperliquid Research Collective',
    author_handle: 'HyperliquidR',
    text: 'Hyperliquid Research Collective shared The Almanack of Hyperliquid by @paramonoww, arguing why Hyperliquid differs from perp DEXes, CEXes, and other crypto protocols.',
    created_at: '2026-06-26T08:00:00.000Z',
    media_urls: [],
    tags: ['hyperliquid', 'x-bookmark'],
    bundle_id: 'hyperliquid-almanack-bundle',
    linked_urls: ['https://www.hyperliquidr.xyz/post/the-almanack-of-hyperliquid'],
    role: 'discovery',
    raw: {
      source: 'mock',
      lane: 'x_bookmarks',
      bundle_id: 'hyperliquid-almanack-bundle',
      role: 'discovery',
      linked_urls: ['https://www.hyperliquidr.xyz/post/the-almanack-of-hyperliquid']
    }
  },
  {
    source: 'web_articles',
    source_id: 'article-hyperliquid-almanack',
    url: 'https://www.hyperliquidr.xyz/post/the-almanack-of-hyperliquid',
    title: 'The Almanack of Hyperliquid',
    author: 'Paramo',
    author_handle: 'paramonoww',
    text: 'The Almanack of Hyperliquid explains how Hyperliquid combines a performant exchange, HyperCore liquidity, HyperEVM programmability, HYPE alignment, and community-led distribution.',
    created_at: '2026-06-26T08:05:00.000Z',
    media_urls: [],
    tags: ['hyperliquid', 'web-article'],
    bundle_id: 'hyperliquid-almanack-bundle',
    parent_url: 'https://x.com/HyperliquidR/status/2070408676620349676',
    role: 'main_source',
    raw: {
      source: 'mock',
      lane: 'web_articles',
      bundle_id: 'hyperliquid-almanack-bundle',
      parent_url: 'https://x.com/HyperliquidR/status/2070408676620349676',
      role: 'main_source'
    }
  },
  {
    source: 'x_bookmarks',
    source_id: 'x-bookmark-hyperliquid-hip4',
    url: 'https://x.com/example/status/1001',
    title: 'Hyperliquid HIP-4 may change builder incentives',
    author: 'Crypto Researcher',
    author_handle: 'cryptoresearcher',
    text: 'Hyperliquid HIP-4 proposes changes that could reshape builder incentives, HyperEVM activity, and liquidity routing across the ecosystem.',
    created_at: '2026-06-26T10:00:00.000Z',
    media_urls: [],
    tags: ['hyperliquid', 'x-bookmark'],
    raw: {
      source: 'mock',
      lane: 'x_bookmarks'
    }
  },
  {
    source: 'opennews',
    source_id: 'opennews-tokenized-stocks-001',
    url: 'https://news.example/tokenized-stocks-market-structure',
    title: 'Tokenized stocks gain new market structure attention',
    author: 'OpenNews Mock',
    text: 'Tokenized stocks are drawing attention as brokers, exchanges, and crypto rails explore 24/7 equity settlement and RWA distribution.',
    created_at: '2026-06-26T11:00:00.000Z',
    media_urls: [],
    tags: ['tokenized_stocks', 'rwa'],
    raw: {
      source: 'mock',
      lane: 'opennews'
    }
  },
  {
    source: 'opennews',
    source_id: 'opennews-ai-agent-001',
    url: 'https://news.example/ai-agent-wallets',
    title: 'AI agents begin moving from demos to production workflows',
    author: 'OpenNews Mock',
    text: 'AI agent teams are shifting from demo loops toward production workflows that include memory, tools, permissions, and wallet-like authorization.',
    created_at: '2026-06-26T12:00:00.000Z',
    media_urls: [],
    tags: ['ai_agents', 'ai'],
    raw: {
      source: 'mock',
      lane: 'opennews'
    }
  },
  {
    source: 'daily_news',
    source_id: 'daily-stablecoin-rwa-001',
    url: 'https://digest.example/stablecoin-rwa',
    title: 'Stablecoin and RWA rails keep converging',
    author: 'Daily News Mock',
    text: 'Stablecoin issuers and RWA platforms are converging around treasury products, settlement networks, and regulated distribution channels.',
    created_at: '2026-06-26T13:00:00.000Z',
    media_urls: [],
    tags: ['stablecoins', 'rwa'],
    raw: {
      source: 'mock',
      lane: 'daily_news'
    }
  },
  {
    source: 'manual_md',
    source_id: 'manual-wallet-strategy-001',
    title: 'Wallet strategy note for agentic users',
    author: 'Manual Dump',
    text: 'Wallet strategy is moving toward embedded accounts, smart wallets, recovery, and policy controls for AI agent permissions.',
    created_at: '2026-06-26T14:00:00.000Z',
    media_urls: [],
    tags: ['wallets', 'ai_agents'],
    raw: {
      source: 'mock',
      lane: 'manual_md'
    }
  }
];
