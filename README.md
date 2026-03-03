# 🎉 Simsimi — Discord Bot

> A feature-rich, all-in-one Discord bot packed with **30+ commands** — including a native **Slash Command** interface, interactive giveaway system, casino-style mini-games, and a full economy with shops & inventory.
> 
> 🌍 **Full Bilingual Support (English & Vietnamese)!**

[![Discord.js](https://img.shields.io/badge/discord.js-v14-5865F2?logo=discord&logoColor=white)](https://discord.js.org/)
[![Node.js](https://img.shields.io/badge/Node.js-%E2%89%A518-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

---

## 🤖 About

**Simsimi** is a multipurpose Discord bot designed to bring fun, engagement, and utility to your server. Whether you're hosting giveaways for your community, competing in casino games with friends, building your virtual wealth, or just checking server stats — Simsimi has you covered.

**Prefix:** `$` — All commands start with a dollar sign (e.g., `$help`, `$daily`, `$blackjack`)

### Key Highlights

- 🌍 **Bilingual Support (i18n)** — Play seamlessly in English or Vietnamese. The bot supports global server defaults and custom user overwrites (`$language`)!
- 🎁 **Giveaway Management** — Create timed giveaways with button/reaction entry, role restrictions, pause/resume, and auto winner selection.
- 🎮 **18+ Interactive Mini-Games** — From Blackjack & Poker to Minesweeper, Trivia, Emoji Quiz, Hangman, and more — all with rich embeds & interactive button UIs.
- 💰 **Virtual Economy (Balanced)** — Earn coins through daily rewards and working. All bonuses are strictly capped (150% base / 200% VIP) to ensure long-term stability.
- 🛒 **Dynamic Shop & Inventory** — Purchase items from 8 categories. Manage your wealth with a 10% Transfer Tax and 70% Sell Recovery rate.
- 🔧 **Server Utilities** — Ping, avatar viewer, server/user stats, and rich profiles with *Net Worth* tracking.
- 💾 **Safe & Isolated Storage** — Securely saved in local SQLite databases. The main bot and specialized instances (like Word Chain) use separate isolated database files for maximum stability.
- ⚡ **Native Slash Commands** — Modern interaction support with integrated help tooltips and autocomplete.

### Invite the Bot

```text
https://discord.com/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=8&scope=bot%20applications.commands
```
> Replace `YOUR_CLIENT_ID` with your bot's Application ID from the [Discord Developer Portal](https://discord.com/developers/applications).

---

## 📑 Table of Contents

- [Features Overview](#-features-overview)
- [Giveaway System](#-giveaway-system)
- [Fun & Games](#-fun--games)
- [Economy & Finance System](#-economy--finance-system)
- [Social & Marriage System](#-social--marriage-system)
- [Utility Commands](#-utility-commands)
- [Setting up the Language (i18n)](#-setting-up-the-language)
- [Getting Started](#-getting-started)
- [Project Structure](#-project-structure)
- [Tech Stack](#-tech-stack)

---

## ✨ Features Overview

- 🌍 **English & Vietnamese Localization** — `$lang server vi` or `$lang user en`.
- 🎁 **Giveaway System** — Create, manage, pause, resume, reroll, and delete giveaways.
- 🎮 **Mini-Games** — Blackjack, Poker, Minesweeper, Trivia, Emoji Quiz, Hangman, Word Scramble, Wordchain, Memory, and more!
- 💰 **Full Economy System** — `$daily`, `$work`, `$fish`, profiles, and global leaderboards.
- 💞 **Social & Marriage** — `$marry`, `$divorce`, `$gift`, and exclusive Ring/Bouquet buffs!
- 🛒 **Item Shop & Interactivity** — Extensive lore, item descriptions (`$iteminfo`), buy, sell, and multiplier enhancements.
- 🔧 **Utility Tools** — Check latencies, user/server infographics, avatar rippers, and `$support` QR generation.
- 🛡️ **Double-Layered Security** — Centralized admin & owner permission gatekeeping.

---

## 🎁 Giveaway System

Full-featured giveaway management with clickable buttons. Requires `Manage Messages` permission.

| Subcommand | Usage | Description |
|------------|-------|-------------|
| `start` | `$giveaway start <time> <winners> <prize>` | Create a new giveaway (e.g. `$g start 10m 1 Nitro`) |
| `end` | `$giveaway end <message_id>` | End a giveaway immediately and pick winners |
| `reroll` | `$giveaway reroll <message_id>` | Re-pick a new winner from participants |
| `list` | `$giveaway list` | List all active giveaways in the server |
| `pause` | `$giveaway pause <message_id>` | Temporarily pause a giveaway |
| `resume` | `$giveaway resume <message_id>` | Resume a paused giveaway |
| `delete` | `$giveaway delete <message_id>` | Permanently delete a giveaway |

> **Aliases:** `$g`

---

## 🎮 Fun & Games

All games feature interactive button-based UIs and rich embeds. Many support **coin betting** — win to grow your wealth!

> [!NOTE]
> **Manual Cooldowns:** For most games, the cooldown timer starts *after* the game concludes, rather than when the command is first issued. This ensures fair play and prevents spamming during active game sessions.

### 🃏 Card & Casino Games

| Command | Aliases | Description |
|---------|---------|-------------|
| `$blackjack [bet]` | `$bj` | Play Blackjack against the dealer. Hit or Stand. Max bet: 250k. Pays 2× on win, 2.5× on natural! |
| `$poker [bet]` | `$pk` | Texas Hold'em style multiplayer poker with lobby system. Join with buttons. Full betting rounds via modals! |
| `$slots` | — | Spin the slot machine. Match 3 symbols to win huge Jackpots! |
| `$coinflip` | `$cf`, `$flip` | Flip a coin — simple heads or tails betting |
| `$dice` | `$roll` | Roll the golden dice for a quick gamble |

### 🧩 Logic & Word Games

| Command | Aliases | Description |
|---------|---------|-------------|
| `$minesweeper [bet]` | `$mine`, `$ms` | Interactive grid Minesweeper. Flags, bombs, and shields! |
| `$hangman` | `$hang`, `$hm` | Classic Hangman. 6 lives, guess letters or the full word with a hint dictionary system. |
| `$scramble` | `$scram` | Unscramble a random word from 8 categories. Win 50 coins. |
| `$wordchain` | `$wc` | Multiplayer word chain. Play continuously in a channel until told to stop (Nối chữ)! |
| `$guess` | `$gn` | Guess a random number between 1 and 100 within 10 attempts! |
| `$emojiquiz` | `$quiz` | Guess the Movie/Phrase/Place from a string of Emojis! Huge puzzle database. |
| `$memory` | `$mem`, `$match`| Flip cards and find the matching pairs before time expires! |
| `$trivia` | — | Answer multiple-choice questions from 150+ diverse trivia challenges. |

### 🎲 Fast-Paced Duels & Challenges

| Command | Aliases | Description |
|---------|---------|-------------|
| `$rps` | `$rock` | Rock Paper Scissors. Solo against bot or PvP duel! |
| `$tictactoe` | `$ttt` | Challenge a friend to 3x3 Tic-Tac-Toe. Winner takes the pot. |
| `$connect4` | `$c4` | 7x6 Connect 4. Strategic 1v1 PvP matches. |
| `$reaction` | `$react` | Reaction speed test. Click the button the instant it flashes "GO"! |

---

## 💰 Economy & Finance System

Earn, spend, invest, and compete. All data flawlessly persists across restarts.

| Command | Aliases | Description |
|---------|---------|-------------|
| `$balance` | `$bal`, `$bl` | Check your current coin balance |
| `$rank` | `$lvl`, `$level` | Server-wide leaderboard for Levels and Jobs! |
| `$profile` | `$p`, `$prof` | Comprehensive overview: Wallet, Level, Ranking, Total Net Worth, and Collection. |
| `$daily` | `$d`, `$dy` | Claim daily rewards. Boosted by items like Smartphones & Mansions! |
| `$work` | `$w`, `$wk` | Work a job (Programmer, Chef, Doctor...) for hourly income! |
| `$job` | `$j` | Set or view your current career to earn specialized bonuses. |
| `$beg` | — | Beg for coins. A quick way to get some pocket change! |
| `$search` | — | Search various locations (Bus, Trash, Bed) for hidden loot. |
| `$crime` | — | High-risk, high-reward! Commit a crime for massive gains or heavy fines. |
| `$slut` | — | Similar to crime, but with different success rates and payouts. |
| `$rob` | — | Risk your reputation to steal coins from another user! |
| `$fish` | `$fishing` | The fishing minigame! Requires Rod & Bait to catch 31+ species. |
| `$shop` | `$sh`, `$store` | Browse the item shop by category (Tools, Baits, Income, Daily, Gamble). |
| `$buy` | `$b` | Buy an item by Name or numeric ID (e.g., `$buy 13` or `$buy laptop`). |
| `$sell` | `$s` | Sell items back to the shop for a 70% refund. |
| `$use` | — | Use a consumable item from your inventory to trigger its effects. |
| `$inventory` | `$inv` | View your sorted inventory, total items, and absolute property value (`Net Worth`). |
| `$iteminfo` | `$item`, `$info`| Read detailed lore, multiplier stats, and pricing for any specific item! |
| `$transfer` | `$pay`, `$tf` | Send coins seamlessly to another user. (10% Tax applies) |
| `$leaderboard` | `$lb`, `$top` | Global server ranking based strictly on accurate **Net Worth** (Wallet + Inventory). |
| `$crate` | `$ruong`, `$gacha`| Open lucky crates with nerfed, balanced cash rewards. |
| `$house` | `$home`, `$nha` | Buy and decorate real estate for permanent income and cap multiplier buffs. |
| `$business` | `$biz` | Buy and manage businesses to generate massive passive hourly income. |

### 💸 Money Shorthand
Simsimi supports shorthand for betting and economy inputs to save you time.
- `k` — Thousands (e.g., `$bj 5k` = 5,000)
- `m` — Millions (e.g., `$bj 2m` = 2,000,000)
- `b` — Billions (e.g., `$bj 1b` = 1,000,000,000)
- `all` — Your entire wallet balance (up to Max Bet limit)

---

## 💞 Social & Marriage System

Build relationships, share your wealth, and earn exclusive couple buffs!

| Command | Aliases | Description |
|---------|---------|-------------|
| `$marry <user>` | `$propose` | Propose to another user! Requires a Wedding Ring `701` or Diamond Ring `702` from the shop. Grants global permanent income bonuses (+25% or +50%). |
| `$divorce` | — | End your marriage and lose your couple bonuses. |
| `$marriage` | `$couple` | Check the current status and duration of your marriage. |
| `$gift <user> <item_id>` | `$give` | Send an inventory item to a friend. Giving a Wedding Bouquet grants them a temporary massive bonus! |

---

## 🌐 Setting up the Language

The bot is fully localized! 
- The ultimate fallback language is `English`.
- If a server Administrator sets a language, everyone in the server sees that language.
- If a User sets a language explicitly, their personal preference will override the server.

| Command | Description |
|---------|-------------|
| `$lang server vi` | Changes the default language for the ENTIRE server to Vietnamese. (Requires Admin) |
| `$lang user en` | Sets your PERSONAL interface language to English. |
| `$lang reset` | Clears your personal setting to sync with the server default again. |

---

##  Utility Commands

| Command | Aliases | Description |
|---------|---------|-------------|
| `$ping` | `$p` | Check bot latency, API response time, and detailed hardware usage (RAM, Uptime, Node.js ver) |
| `$avatar [user]` | `$av` | Display a user's avatar. Also supports rendering their Server Profile Avatar and Banner! |
| `$serverinfo` | — | View deep server stats (Boost tiers, Offline ratios, Text/Voice channel split) |
| `$userinfo [user]` | `$user`, `$ui` | View account age, Discord badges, highest roles, and Discord permissions. |
| `$support` | `$qr`, `$donate` | Show the developer's beautifully generated QR code to buy them a coffee! |
| `$help [command]`| — | Displays a highly interactive dropdown menu of all categories. Pass a command name to generate a highly detailed Strategy & Rules Guide! |

---

## 🛠️ Owner & Admin Commands

| Command | Aliases | Description |
|---------|---------|-------------|
| `$setdistchannel` | — | Set the channel for auto-giveaway distributions. (Admin Only) |
| `$resetuser <user>` | — | Completely wipe a user's economy data. (Owner Only) |
| `$resetdatabase` | — | Master wipe of all database tables. (Owner Only) |
| `$shutdown` | — | Gracefully stops the bot and prevents it from executing commands until actively booted. (Owner Only) |
| `$startup` | `$boot` | Wakes the bot up from a shutdown logic state. (Owner Only) |
| `$update` | — | Forces a manual database save and cache dump. (Owner Only) |

---

## 🔡 Standalone Word Chain Bot

For servers wanting a dedicated 24/7 **Word Chain (Nối Chữ)** experience without the clutter of other commands, you can run the bot in Standalone Mode.

- **Independent Execution**: Runs on a separate process via `src/wc.js`.
- **Isolated Database**: Uses `wordchain.db` which only stores necessary user & guild data.
- **Continuous Play**: Players join by typing words directly; no prefix needed once a game starts in a channel.

**Run Standalone:**
```bash
npm run wc
```

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) **v18.0.0** or higher
- A [Discord Bot Token](https://discord.com/developers/applications)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/bot-discord.git
   cd bot-discord
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**

   Create a `.env` file in the root directory:
   ```env
   DISCORD_TOKEN=your_bot_token_here
   OWNER_ID=your_discord_user_id
   ```

4. **Start the bot**
   ```bash
   npm start
   ```

   For rapid development:
   ```bash
   npm run dev
   ```

---

## 📁 Project Structure

```text
bot-discord/
├── src/
│   ├── index.js              # Main Bot entry point
│   ├── wc.js                 # Standalone Word Chain Bot entry point
│   ├── database.js            # SQLite database manager (Shared)
│   ├── config.js              # Global configuration, prices, cooldowns
│   ├── locales/               # i18n Translation dictionaries (en.json, vi.json)
│   ├── commands/              # 50+ Implementations divided into categories:
│   │   ├── admin/             # Server moderation
│   │   ├── assets/            # Housing, Business, Crates
│   │   ├── earning/           # Work, Daily, Fish, Crime
│   │   ├── finance/           # Shop, Inventory, Transfer, Balance
│   │   ├── gambling/          # Blackjack, Slots, CoinFlip
│   │   ├── minigames/         # Trivia, Hangman, Minesweeper
│   │   ├── owner/             # Bot owner utilities
│   │   ├── social/            # Marriage, Profile, Rank
│   │   └── utility/           # Ping, Help, Userinfo
│   └── utils/                 # Core logic engines (i18n, Economy, Leveling)
├── databases.db               # Main SQLite database (auto-generated)
├── wordchain.db               # Isolated Word Chain database (auto-generated)
├── package.json
└── .env                       # Secrets
```

---

## ⚙️ Tech Stack

| Technology | Purpose |
|------------|---------|
| [Node.js](https://nodejs.org/) ≥ 18 | JavaScript runtime |
| [discord.js](https://discord.js.org/) v14 | Discord API framework |
| [sql.js](https://github.com/sql-js/sql.js) | SQLite database (in-process, fast IO) |
| [ms](https://github.com/vercel/ms) | Human-readable duration processing |
| [dotenv](https://github.com/motdotla/dotenv) | Environment variable management |

---

## 📝 License

This project is open-source and available for personal use.
