import process from 'node:process';
import { createFirehoseBot } from '../src/main/firehose/bot.js';

// Launch the firehose bot (issue #3 commit 13). Env comes from .env via
// node --env-file-if-exists (see package.json); config loading fails with
// a clear message when a var is missing. SIGINT/SIGTERM tear the timer
// down and log out of Discord cleanly.

let bot;
try {
  bot = createFirehoseBot();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

async function shutdown(signal) {
  console.log(`\n${signal} received — stopping firehose bot`);
  await bot.stop();
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

bot.start().catch((error) => {
  console.error(`firehose bot failed to start: ${error.message}`);
  process.exit(1);
});
