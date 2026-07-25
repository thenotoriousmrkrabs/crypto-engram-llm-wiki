import { queryColdStore, parseSince, formatDigest } from '../src/main/firehose/cold-store-query.js';

// Ad-hoc digest over the firehose cold store. No AI — it filters and prints the
// summary-ready cards; a summarize step (Hermes) reads this output.
//
//   node scripts/digest.js --coin HYPE --since today
//   node scripts/digest.js --theme Polymarket --since 24h --score 85
//   node scripts/digest.js --coin HYPE --theme Hyperliquid --since 7d --limit 20
//
// Flags: --coin (repeatable/comma), --theme (repeatable/comma), --since,
//        --score, --signal, --limit, --source.

function parseArgs(argv) {
  const args = { coins: [], themes: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    const next = argv[i + 1];
    const take = () => { i += 1; return next; };
    switch (flag) {
      case '--coin': args.coins.push(...String(take()).split(',').map((s) => s.trim()).filter(Boolean)); break;
      case '--theme': args.themes.push(...String(take()).split(',').map((s) => s.trim()).filter(Boolean)); break;
      case '--since': args.since = take(); break;
      case '--score': args.minScore = Number(take()); break;
      case '--signal': args.signal = take(); break;
      case '--limit': args.limit = Number(take()); break;
      case '--source': args.source = take(); break;
      default: break;
    }
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const cards = await queryColdStore({
    source: args.source || 'opennews',
    coins: args.coins,
    themes: args.themes,
    since: parseSince(args.since),
    minScore: Number.isFinite(args.minScore) ? args.minScore : 0,
    signal: args.signal,
    limit: Number.isFinite(args.limit) ? args.limit : undefined
  });

  const scope = [
    args.coins.length ? `coins: ${args.coins.join(', ')}` : '',
    args.themes.length ? `themes: ${args.themes.join(', ')}` : '',
    args.since ? `since: ${args.since}` : '',
    args.minScore ? `score ≥ ${args.minScore}` : ''
  ].filter(Boolean).join(' · ');

  console.log(formatDigest(cards, { heading: scope ? `# Digest — ${scope}` : '# Digest' }));
}

main().catch((error) => {
  console.error(`digest failed: ${error.message}`);
  process.exitCode = 1;
});
