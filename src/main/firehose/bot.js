import { Client, GatewayIntentBits, StringSelectMenuBuilder, ActionRowBuilder, MessageFlags } from 'discord.js';
import { loadFirehoseConfig } from './config.js';
import { OpenNewsMCPAdapter } from '../adapters/opennews-mcp-adapter.js';
import { runPullAndPost } from './pull-and-post.js';
import { hasItem, itemId } from './cold-store.js';
import { promoteItems } from './promote.js';
import { queryColdStore, parseSince } from './cold-store-query.js';
import {
  parseSummarizeCommand,
  buildSummaryPost,
  formatPromoteResult,
  splitForDiscord,
  refFromValue,
  SUMMARY_PROMOTE_ID
} from './summary.js';
import { getVaultRoot } from '../utils/config.js';

// The always-on bot shell (issue #3 commit 12). Deliberately THIN: every
// behavior here — config, pull, cold store, posting, summary building,
// promote — is a tested function; this file only wires Discord events and
// a timer to them. Live Discord/timer I/O is smoke-tested, not unit-tested.
//
// Requires the MESSAGE CONTENT intent (Discord dev portal -> Bot) so the
// `!summarize` command and the select-menu markers can be read.
//
// Promotion is now batch-only through the summary channel (`!summarize` ->
// grouped digest -> multi-select -> Promote). The old per-message 💾 reaction
// was removed: with 100+ raw messages it was the wrong surface, and the
// summary channel replaces it with one deliberate selection.

export function createFirehoseBot({ env = process.env, log = console } = {}) {
  const config = loadFirehoseConfig({ env });
  const vaultRoot = getVaultRoot();
  const adapter = new OpenNewsMCPAdapter({
    token: config.opennewsToken,
    minScore: config.minScore,
    coins: config.coins,
    themes: config.themes,
    maxPages: config.maxPages,
    // Paging stops once a page is entirely already in the cold store — that is
    // the signal the gap since the last tick is fully covered.
    isSeen: (item) => hasItem({ source: 'opennews', id: itemId(item) })
  });

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent
    ]
  });

  let timer = null;

  async function tick() {
    try {
      const channel = await client.channels.fetch(config.discordChannelId);
      const result = await runPullAndPost({ adapter, channel, langs: config.langs });
      log.log(
        `firehose tick: fetched ${result.fetched}, posted ${result.posted}, ` +
        `seen ${result.skipped}, other-language ${result.skippedLang}`
      );
      // Per-query breakdown (label fetched/new), biggest new-contributors first,
      // so it's clear which pulls to trim if the volume is too high.
      const stats = (adapter.lastStats || [])
        .slice()
        .sort((a, b) => b.fresh - a.fresh || b.fetched - a.fetched)
        .map((stat) => `${stat.label} ${stat.fetched}/${stat.fresh}`)
        .join(' · ');
      if (stats) {
        log.log(`firehose per-query (fetched/new): ${stats}`);
      }
    } catch (error) {
      // A failed tick is not fatal — the next tick simply catches up (#25).
      log.error(`firehose tick failed: ${error.message}`);
    }
  }

  client.once('clientReady', async () => {
    log.log(
      `firehose bot ready as ${client.user.tag}; ` +
      `${config.coins.length} coins + ${config.themes.length} themes, ` +
      `pulling every ${config.pullIntervalMs / 60000} min`
    );
    await tick();
    timer = setInterval(tick, config.pullIntervalMs);
  });

  // `!summarize [since]` in the summary channel: query the cold store, post the
  // grouped Coins/Themes digest, and attach a select menu whose options carry
  // each item's source:id marker. The reading surface that replaces scrolling
  // the raw firehose channel.
  client.on('messageCreate', async (message) => {
    try {
      if (message.author?.bot || message.channelId !== config.summaryChannelId) {
        return;
      }
      const command = parseSummarizeCommand(message.content);
      if (!command) {
        return;
      }
      const cards = await queryColdStore({ since: parseSince(command.since), minScore: config.minScore });
      const { content, options } = buildSummaryPost(cards, {
        heading: `# Firehose summary — last ${command.since}`
      });
      const chunks = splitForDiscord(content);
      // Send the digest across as many messages as the 2000-char cap needs; the
      // select menu rides on the final chunk (or its own message if there are none).
      for (let i = 0; i < chunks.length - 1; i += 1) {
        await message.channel.send(chunks[i]);
      }
      const last = chunks[chunks.length - 1];
      const components = options.length
        ? [new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
              .setCustomId(SUMMARY_PROMOTE_ID)
              .setPlaceholder('Select items to promote to the LLM-wiki')
              .setMinValues(1)
              .setMaxValues(options.length)
              .addOptions(options)
          )]
        : [];
      await message.channel.send({ content: last, components });
      log.log(`summarize (${command.since}): ${cards.length} items, ${options.length} selectable`);
    } catch (error) {
      log.error(`summarize failed: ${error.message}`);
    }
  });

  // The batch promote: a selection interaction already carries every chosen
  // source:id, so this is stateless — no message map, restart-safe, dedupe-safe.
  client.on('interactionCreate', async (interaction) => {
    try {
      if (!interaction.isStringSelectMenu?.() || interaction.customId !== SUMMARY_PROMOTE_ID) {
        return;
      }
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const refs = interaction.values.map(refFromValue).filter(Boolean);
      const result = await promoteItems({ vaultRoot, refs });
      await interaction.editReply(formatPromoteResult(result));
      log.log(`summary promote: ${result.promoted} saved, ${result.duplicate} dup, ${result.failed} failed`);
    } catch (error) {
      log.error(`summary promote failed: ${error.message}`);
    }
  });

  return {
    client,
    start: () => client.login(config.discordBotToken),
    stop: async () => {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
      await client.destroy();
    }
  };
}
