# Discord Bot + Channel Design — Handoff Brief

> **Purpose of this file:** a self-contained brief you can paste to another
> assistant (e.g. ChatGPT) so it understands the whole system and can help you
> (1) create the Discord bot correctly, and (2) design a channel layout for
> readable, sorted news plus your existing Hermes command center. You should
> not need to share any other file for it to give good advice.

---

## 1. What this system is (one paragraph)

A **local-first "LLM-Wiki"** for crypto/AI research called the **Content
Intelligence Vault**. Raw material (news, tweets, clippings) flows in; a
human curates the good stuff; an agent later *compiles* it into wiki pages
that cite their sources and carry a confidence score. The overriding goal is
that retrieval returns **the most accurate answer for the fewest tokens** —
accuracy · relevancy · cost-efficiency. **Hermes** is a separate agent
(connected to the user's Codex account, living in Discord) that will later
orchestrate this vault. Hermes' command center in Discord **already exists**.

## 2. Runtime topology (who does what)

Three distinct roles — this matters for the bot design:

- **Builder** — Claude Code / Codex, build-time only. Writes the code. Not running in production.
- **Relay** — a **plain Node.js service, always-on, NO AI**. This is the Discord bot + the MCP pull loop. It is dumb plumbing: fetch → store → post → on-tap promote. It never calls an LLM.
- **Brain** — Hermes, on-demand judgment. Invoked when a human/command asks for analysis. Owns the "live watch" and higher-order routing later.

**Key point for the bot:** the always-on connector is *dumb code*, not an AI. It moves items and reacts to a save tap. All intelligence happens elsewhere (either the MCP's own AI rating, or Hermes on demand).

## 3. The data sources (MCPs)

The user holds **one premium 6551 API token** that covers two MCP sources.
Both share backend `https://ai.6551.io` and Bearer auth with that token.

- **opennews-mcp** — crypto/AI news firehose.
  - REST: `GET /open/news_search` → `{ data: [...articles], total }`.
  - Also has a WebSocket push (`news_wss`) — **not used yet**; we chose scheduled pull.
  - Each article carries an **AI rating** (`aiRating: { score, grade, signal }`) — this is the MCP's own scoring, e.g. score 0–100, grade A–F, signal long/short. There are two logical event types: `news.update` (everything) and `news.ai_update` (AI-scored/higher-signal subset).
- **opentwitter-mcp** — tweets from watched accounts.
  - REST: `POST /open/twitter_user_tweets` with JSON body `{ username, maxResults, product:'Latest', includeReplies:false, includeRetweets:false }` → `{ data: [...tweets] }`.
  - Watch list is currently **empty by design** — the user will populate it later, and Hermes will eventually own a live watch-push. Internal source name: `x_watchlist`.
- **daily-news** — dropped (redundant under the premium token).

## 4. What is actually built today (PR #4)

A Node.js ESM service (zero deps except `discord.js`) that does one loop:

```
[scheduled pull]  MCP REST  ->  cold store (firehose/, on disk, OUTSIDE the vault, gitignored)
                                     |
                                     v
                              Discord channel  (one message per new item)
                                     |
                              user taps 💾 reaction
                                     v
                              promote  ->  vault 00_Inbox   (the ONE gate items cross into the wiki)
```

Concrete pieces:
- **Scheduled pull**, default every 20 min (`FIREHOSE_PULL_INTERVAL_MINUTES`). Not live WebSocket — chosen for token efficiency and to batch work.
- **Cold store** = one JSON file per item, keyed by item id, on local disk *outside* the Obsidian vault. It is stored-but-never-indexed; its id set is also the "already seen" set (dedup). Nothing here is in the retrieval corpus.
- **Discord post format** — each item is one message:
  - line 1: `📰 **<title>**`
  - line 2: the source URL
  - line 3: `` `source:id` `` marker + tags + AI rating (e.g. `` `opennews:987654` · crypto · AI 91 A long``)
  - The **`source:id` marker is load-bearing**: it is how a later tap is resolved back to the exact cold-store item, with no in-memory message map, surviving bot restarts.
- **Tap-to-save** — the user reacts **💾** on any posted message; the bot reads the marker, looks up the cold-store item, and **promotes** it into the vault's `00_Inbox`. This human tap is the *only* path from the firehose into the wiki (uncurated firehose must never auto-enter the wiki).

## 5. What the bot needs — permissions & intents (be precise here)

The current bot (`discord.js` v14) connects with these **Gateway Intents**:
- `Guilds`
- `GuildMessages`
- `GuildMessageReactions`  ← needed to hear the 💾 tap
- `MessageContent`  ← **PRIVILEGED**: must be toggled ON in the Developer Portal (Bot → Privileged Gateway Intents → Message Content Intent). Without it, reaction/message content reads come back empty and tap-to-save silently fails.

**OAuth2 invite scopes:** `bot` (add `applications.commands` if you later want slash commands).

**Channel/bot permissions** (needed in every channel the bot posts to or watches):
- View Channel
- Send Messages
- Embed Links (URL previews)
- Read Message History (to fetch the message a reaction was added to)
- Add Reactions (optional — only if you want the bot to pre-seed the 💾 for one-click saving)

**Setup facts:** bot token + target channel id go in a gitignored `.env`
(`DISCORD_BOT_TOKEN`, `DISCORD_CHANNEL_ID`, `OPENNEWS_TOKEN`). Tokens are
never committed or pasted into chat.

## 6. IMPORTANT current limitation for channel design

**The code today posts everything to ONE channel** (a single `DISCORD_CHANNEL_ID`).
Multi-channel routing (sending different items to different channels by
source / AI score / tag) is **not built yet** — it's a routing layer that has
to be added: a map from (source, score, tags) → channel id, plus per-channel
dedup. So any channel taxonomy you design is a **target** that will drive a
small code change, not something that works out of the box. Design freely,
but know routing is the next build step.

Design decisions already locked (respect these):
- **Two conceptual streams intended:** a **raw** stream (everything, fast, low bar) and a **signal** stream (AI-scored / score-gated, high bar). Cross-stream overlap is *intentional* — a high-signal item can appear in both.
- **Within a channel, dedup by item id;** across channels, overlap is fine.
- `x_watchlist` (tweets) is a separate stream from news.
- Promotion into the wiki is always the human 💾 tap → `00_Inbox`.
- Hermes' command center channel(s) already exist — the news channels should sit alongside, not replace them.

---

## 7. What I want from you (the ask to paste under this brief)

> Based on the system above, propose:
> 1. **A concrete Discord channel layout** (category + channel names) for
>    reading crypto/AI news cleanly without clutter, that fits the raw-stream
>    / signal-stream model, keeps tweets separate, and sits next to my
>    existing Hermes command center. Give me actual channel names and a
>    one-line purpose for each, and say which items route to which channel
>    (by source / AI score / tag).
> 2. **A step-by-step guide to create the bot** in the Discord Developer
>    Portal with exactly the intents and permissions listed in section 5,
>    including the OAuth2 invite URL settings.
> 3. Any channel-permission setup (e.g. read-only-for-humans posting channels
>    vs. the command channel) that makes the reading experience clean.
>
> Keep the routing realistic given section 6 (one channel works today;
> multi-channel needs a routing layer I'll build next). Prefer fewer, well-named
> channels over many noisy ones.
