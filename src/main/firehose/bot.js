import { Client, GatewayIntentBits, Partials } from 'discord.js';
import { loadFirehoseConfig } from './config.js';
import { OpenNewsMCPAdapter } from '../adapters/opennews-mcp-adapter.js';
import { runPullAndPost } from './pull-and-post.js';
import { parseMarker } from './discord-poster.js';
import { promoteItem } from './promote.js';
import { getVaultRoot } from '../utils/config.js';

// The always-on bot shell (issue #3 commit 12). Deliberately THIN: every
// behavior here — config, pull, cold store, posting, marker parsing,
// promote — is a tested function; this file only wires Discord events and
// a timer to them. Live Discord/timer I/O is smoke-tested, not unit-tested.
//
// Requires the MESSAGE CONTENT intent (Discord dev portal -> Bot) so the
// tap handler can read the `source:id` marker out of the tapped message.

const SAVE_EMOJI = '💾';

export function createFirehoseBot({ env = process.env, log = console } = {}) {
  const config = loadFirehoseConfig({ env });
  const vaultRoot = getVaultRoot();
  const adapter = new OpenNewsMCPAdapter({ token: config.opennewsToken });

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.GuildMessageReactions,
      GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction]
  });

  let timer = null;

  async function tick() {
    try {
      const channel = await client.channels.fetch(config.discordChannelId);
      const result = await runPullAndPost({ adapter, channel });
      log.log(`firehose tick: fetched ${result.fetched}, posted ${result.posted}, seen ${result.skipped}`);
    } catch (error) {
      // A failed tick is not fatal — the next tick simply catches up (#25).
      log.error(`firehose tick failed: ${error.message}`);
    }
  }

  client.once('clientReady', async () => {
    log.log(`firehose bot ready as ${client.user.tag}; pulling every ${config.pullIntervalMs / 60000} min`);
    await tick();
    timer = setInterval(tick, config.pullIntervalMs);
  });

  client.on('messageReactionAdd', async (reaction, user) => {
    try {
      if (user.bot) {
        return;
      }
      if (reaction.partial) {
        await reaction.fetch();
      }
      if (reaction.emoji.name !== SAVE_EMOJI) {
        return;
      }
      if (reaction.message.partial) {
        await reaction.message.fetch();
      }
      const marker = parseMarker(reaction.message.content);
      if (!marker) {
        return;
      }

      const { promoted, duplicate, rawPath } = await promoteItem({
        vaultRoot,
        source: marker.source,
        id: marker.id
      });
      const status = promoted ? 'saved to wiki inbox' : duplicate ? 'already in the wiki' : 'not saved';
      await reaction.message.reply(`💾 ${status}${rawPath ? `: \`${rawPath}\`` : ''}`);
      log.log(`promote ${marker.source}:${marker.id} -> ${status}`);
    } catch (error) {
      log.error(`promote failed: ${error.message}`);
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
