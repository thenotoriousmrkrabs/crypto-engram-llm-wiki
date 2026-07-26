// Runtime config for the firehose bot (issue #3, DECISION #25).
// Pure: reads only the env object it is given, so tests inject fakes and the
// suite never needs real tokens. Secrets stay in the environment (.env is
// gitignored; .env.example carries placeholders only).

const REQUIRED_VARS = ['OPENNEWS_TOKEN', 'DISCORD_BOT_TOKEN', 'DISCORD_CHANNEL_ID'];

// Default cadence: 4x/day (every 6h). A longer interval accumulates more than
// the ~100-row page cap per query, so it is paired with paging (maxPages) that
// reaches back past a single page (#25 addendum: scheduled-over-live).
const DEFAULT_PULL_INTERVAL_MINUTES = 360;

// How many pages each query walks back per tick before giving up (safety bound
// on API calls). 3 pages x 100 rows = a 300-item margin per query per pull,
// enough to cover a 6h gap on all but the most extreme volume.
const DEFAULT_MAX_PAGES = 3;

// Standing quality gate: opennews rates every article 0-100 (aiRating.score).
// We pass this as the request `score` floor so low-quality items never leave
// the gateway (fewest tokens, #goal). Default 70 = broad-but-quality. Set
// FIREHOSE_MIN_SCORE=0 to disable the floor and pull everything.
const DEFAULT_MIN_SCORE = 70;

// The curated watchlists. The feed is the UNION of a coin-list pull and one
// full-text pull per theme (see OpenNewsMCPAdapter) — nothing outside these
// lists reaches the channel. Edit via FIREHOSE_COINS / FIREHOSE_THEMES in .env;
// set either to `none` to drop that half, or empty to fall back to these.
const DEFAULT_COINS = ['HYPE', 'BTC', 'BNB', 'ETH', 'SOL', 'USDT', 'USDC', 'ZEC', 'USDS', 'USDe'];
const DEFAULT_THEMES = [
  'HIP-4', 'stablecoin', 'prediction market', 'Polymarket', 'Kalshi', 'Hyperliquid',
  'HIP-3', 'neobank', 'crypto cards', 'Collector Crypt', 'TradFi', 'PerpDex', 'DeFi',
  'Yield', 'Base', 'Robinhood', 'RWAs', 'Smart Contract', 'Layer 1', 'Layer 2', 'CEX',
  'Wallet', 'Listings', 'Memecoin', 'MiCA', 'Privacy', 'Governance', 'Perpetuals',
  'Onchain data', 'x402', 'Lending', 'Borrowing', 'Vault'
];

// Comma-separated env list with a fallback: empty -> the default list;
// literal `none` -> an empty list (drops that pull); otherwise the parsed list.
function parseList(raw, fallback) {
  const trimmed = String(raw ?? '').trim();
  if (trimmed === '') {
    return fallback;
  }
  if (trimmed.toLowerCase() === 'none') {
    return [];
  }
  return trimmed.split(',').map((value) => value.trim()).filter(Boolean);
}

export function loadFirehoseConfig({ env = process.env } = {}) {
  const missing = REQUIRED_VARS.filter((name) => !String(env[name] || '').trim());
  if (missing.length > 0) {
    throw new Error(
      `Missing required firehose env var(s): ${missing.join(', ')}. ` +
      'Copy .env.example to .env and fill in real values (never commit .env).'
    );
  }

  const rawInterval = String(env.FIREHOSE_PULL_INTERVAL_MINUTES ?? '').trim();
  const intervalMinutes = rawInterval === '' ? DEFAULT_PULL_INTERVAL_MINUTES : Number(rawInterval);
  if (!Number.isFinite(intervalMinutes) || intervalMinutes <= 0) {
    throw new Error(
      `FIREHOSE_PULL_INTERVAL_MINUTES must be a positive number, got "${rawInterval}"`
    );
  }

  // Reading-surface language allow-list. Detection is coarse (en / zh / other),
  // so this only usefully holds en and/or zh; `all` disables the filter and
  // posts every language. Other-script items are still stored/seen, just not
  // posted. Default: only the languages the user reads.
  const rawLangs = String(env.FIREHOSE_LANGS ?? '').trim();
  const langs = rawLangs === ''
    ? ['en', 'zh']
    : rawLangs.split(',').map((lang) => lang.trim().toLowerCase()).filter(Boolean);

  const rawMinScore = String(env.FIREHOSE_MIN_SCORE ?? '').trim();
  const minScore = rawMinScore === '' ? DEFAULT_MIN_SCORE : Number(rawMinScore);
  if (!Number.isFinite(minScore) || minScore < 0 || minScore > 100) {
    throw new Error(
      `FIREHOSE_MIN_SCORE must be a number between 0 and 100, got "${rawMinScore}"`
    );
  }

  const coins = parseList(env.FIREHOSE_COINS, DEFAULT_COINS);
  const themes = parseList(env.FIREHOSE_THEMES, DEFAULT_THEMES);

  const rawMaxPages = String(env.FIREHOSE_MAX_PAGES ?? '').trim();
  const maxPages = rawMaxPages === '' ? DEFAULT_MAX_PAGES : Number(rawMaxPages);
  if (!Number.isInteger(maxPages) || maxPages < 1) {
    throw new Error(
      `FIREHOSE_MAX_PAGES must be a positive integer, got "${rawMaxPages}"`
    );
  }

  // Where `!summarize` posts and listens. Optional — falls back to the raw
  // firehose channel so a single-channel setup still works, but pointing it at a
  // separate channel is the intended two-surface layout (raw archive vs. the
  // summary you actually read).
  const summaryChannelId = String(env.DISCORD_SUMMARY_CHANNEL_ID || env.DISCORD_CHANNEL_ID).trim();

  return {
    opennewsToken: String(env.OPENNEWS_TOKEN).trim(),
    discordBotToken: String(env.DISCORD_BOT_TOKEN).trim(),
    discordChannelId: String(env.DISCORD_CHANNEL_ID).trim(),
    summaryChannelId,
    pullIntervalMs: intervalMinutes * 60 * 1000,
    minScore,
    langs,
    coins,
    themes,
    maxPages
  };
}
