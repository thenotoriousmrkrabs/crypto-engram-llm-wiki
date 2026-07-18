// Runtime config for the firehose bot (issue #3, DECISION #25).
// Pure: reads only the env object it is given, so tests inject fakes and the
// suite never needs real tokens. Secrets stay in the environment (.env is
// gitignored; .env.example carries placeholders only).

const REQUIRED_VARS = ['OPENNEWS_TOKEN', 'DISCORD_BOT_TOKEN', 'DISCORD_CHANNEL_ID'];

// Modest default keeps pulls under the ~100-row cap of get_latest_news so
// recall is not lost between ticks (#25 addendum: scheduled-over-live).
const DEFAULT_PULL_INTERVAL_MINUTES = 20;

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

  return {
    opennewsToken: String(env.OPENNEWS_TOKEN).trim(),
    discordBotToken: String(env.DISCORD_BOT_TOKEN).trim(),
    discordChannelId: String(env.DISCORD_CHANNEL_ID).trim(),
    pullIntervalMs: intervalMinutes * 60 * 1000
  };
}
