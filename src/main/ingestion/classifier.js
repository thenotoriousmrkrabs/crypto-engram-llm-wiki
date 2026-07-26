import { compactWhitespace } from '../utils/markdown.js';
import { TOPIC_RULES, CATCH_ALL_TOPIC } from '../config/topics.js';

const ENTITY_RULES = [
  { match: 'hyperliquid', entity: 'Hyperliquid', kind: 'protocol', chains: ['Hyperliquid'], narratives: ['Hyperliquid ecosystem'] },
  { match: 'hyperevm', entity: 'HyperEVM', kind: 'chain', chains: ['HyperEVM'], narratives: ['Hyperliquid ecosystem'] },
  { match: 'hip-4', entity: 'HIP-4', kind: 'proposal', narratives: ['Protocol incentives'] },
  { match: 'tokenized stock', entity: 'Tokenized Stocks', kind: 'market', narratives: ['Tokenized stocks'] },
  { match: 'stablecoin', entity: 'Stablecoins', kind: 'market', narratives: ['Stablecoin rails'] },
  { match: 'rwa', entity: 'RWA', kind: 'market', narratives: ['RWA distribution'] },
  { match: 'wallet', entity: 'Wallets', kind: 'product', narratives: ['Wallet strategy'] },
  { match: 'ai agent', entity: 'AI Agents', kind: 'technology', narratives: ['Agentic workflows'] },
  { match: 'solana', entity: 'Solana', kind: 'chain', chains: ['Solana'] },
  { match: 'base chain', entity: 'Base', kind: 'chain', chains: ['Base'] },
  { match: 'base ecosystem', entity: 'Base', kind: 'chain', chains: ['Base'] },
  { match: 'bnb', entity: 'BNB Chain', kind: 'chain', chains: ['BNB Chain'] },
  { match: 'megaeth', entity: 'MegaETH', kind: 'chain', chains: ['MegaETH'] }
];

const TOKEN_RULES = [
  { match: 'usdc', token: 'USDC' },
  { match: 'usdt', token: 'USDT' },
  { match: 'eth', token: 'ETH' },
  { match: 'btc', token: 'BTC' }
];

export function classifySourceItem(item) {
  const searchable = compactWhitespace(`${item.title} ${item.text} ${(item.tags || []).join(' ')}`).toLowerCase();
  const topicRule = TOPIC_RULES.find((rule) => rule.keywords.some((keyword) => searchable.includes(keyword)));
  const entities = [];
  const chains = [];
  const tokens = [];
  const narratives = [];
  const tags = [...(topicRule?.tags || [])];

  for (const rule of ENTITY_RULES) {
    if (includesTerm(searchable, rule.match)) {
      entities.push(rule.entity);
      chains.push(...(rule.chains || []));
      narratives.push(...(rule.narratives || []));
      if (rule.kind) {
        tags.push(rule.kind);
      }
    }
  }

  for (const rule of TOKEN_RULES) {
    if (includesTerm(searchable, rule.match)) {
      tokens.push(rule.token);
    }
  }

  const topic = topicRule?.home || CATCH_ALL_TOPIC;
  return {
    topic,
    entities: unique(entities),
    chains: unique(chains),
    tokens: unique(tokens),
    narratives: unique(narratives.length > 0 ? narratives : [topic.replaceAll('_', ' ')]),
    tags: unique([topic, ...tags]),
    relevance_score: scoreRelevance(item, searchable),
    content_potential: scoreContentPotential(item, searchable)
  };
}

function scoreRelevance(item, searchable) {
  let score = 45;
  if (item.source === 'x_bookmarks') score += 15;
  if (item.source === 'opennews') score += 10;
  if (searchable.includes('hyperliquid') || searchable.includes('stablecoin')) score += 15;
  if (searchable.includes('tokenized') || searchable.includes('ai agent')) score += 12;
  if ((item.text || '').length > 180) score += 5;
  return Math.min(score, 95);
}

function scoreContentPotential(item, searchable) {
  let score = 40;
  if (searchable.includes('may') || searchable.includes('could') || searchable.includes('shift')) score += 12;
  if (searchable.includes('market structure') || searchable.includes('strategy')) score += 15;
  if (searchable.includes('ai agent') || searchable.includes('wallet')) score += 10;
  if (item.source === 'x_bookmarks') score += 8;
  return Math.min(score, 95);
}

function unique(values) {
  return [...new Set(values.filter(Boolean).map(String))];
}

function includesTerm(text, term) {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, 'i').test(text);
}
