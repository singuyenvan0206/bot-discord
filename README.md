# 🎉 Discord Bot

A feature-rich, all-in-one Discord bot packed with **30+ commands** — including an interactive giveaway system, casino-style mini-games with coin betting, a full economy with shops & inventory, and handy utility commands. Built with [discord.js](https://discord.js.org/) v14 and powered by a persistent SQLite database.

**Prefix:** `$`

---

## 📑 Table of Contents

- [Features Overview](#-features-overview)
- [Giveaway System](#-giveaway-system)
- [Fun & Games](#-fun--games)
- [Economy System](#-economy-system)
- [Utility Commands](#-utility-commands)
- [Shop & Items](#-shop--items)
- [Getting Started](#-getting-started)
- [Project Structure](#-project-structure)
- [Tech Stack](#-tech-stack)

---

## ✨ Features Overview

- 🎁 **Giveaway System** — Create, manage, pause, resume, reroll, and delete giveaways with button & reaction entry
- 🎮 **18 Mini-Games** — Blackjack, Poker, Minesweeper, Trivia, Emoji Quiz, Hangman, Word Scramble, and more
- 💰 **Full Economy** — Earn coins through daily rewards, work, and games. Spend them in the shop for boost items
- 🛒 **Item Shop & Inventory** — Buy items that give permanent multiplier bonuses to your earnings
- 🔧 **Utility Tools** — Check latency, view server/user info, and display avatars
- 💾 **Persistent Data** — All user balances, inventories, and giveaways saved in SQLite

---

## 🎁 Giveaway System

Full-featured giveaway management with button-click and reaction entry. Requires `Manage Messages` permission.

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
>
> **Entry methods:** Users can enter by clicking the 🎉 button or reacting with 🎉
>
> **Features:** Role-restricted entry, live participant count embed, automatic winner selection on timer expiry

---

## 🎮 Fun & Games

All games feature interactive button-based UIs and rich embeds. Many support **coin betting** — win to grow your balance!

### 🃏 Card & Casino Games

| Command | Aliases | Description |
|---------|---------|-------------|
| `$blackjack [bet]` | `$bj` | Play Blackjack against the dealer. Hit or Stand with buttons. Default bet: 50 coins. Pays 2× on win, 2.5× on natural Blackjack. Supports item multiplier bonuses |
| `$poker [bet]` | `$pk` | Texas Hold'em style multiplayer poker with lobby system. Join with buttons, supports bot opponents. Full betting rounds (call, raise, fold, all-in) via modals |
| `$slots` | — | Spin the slot machine. Match symbols to win coin payouts |
| `$coinflip` | `$cf`, `$flip` | Flip a coin — simple heads or tails |
| `$dice` | `$roll` | Roll dice with various betting modes |

### 🧩 Puzzle & Word Games

| Command | Aliases | Description |
|---------|---------|-------------|
| `$minesweeper [bet]` | `$mine`, `$ms` | Interactive 24-cell Minesweeper grid with buttons. Reveal cells, avoid mines. More cells revealed = higher payout |
| `$hangman` | `$hang`, `$hm` | Classic Hangman with 100+ words and hints. 6 lives, guess letters or the full word. 2 minute time limit |
| `$scramble` | `$scram` | Unscramble a random word from 8 categories (Technology, Animals, Food, Geography, Objects, Emotions, Verbs, Adjectives). Win 50 coins. 30 second timer |
| `$wordchain` | `$wc` | Multiplayer word chain — each word must start with the last letter of the previous word. Anti-spam: can't go twice in a row. Type `!stop` to end |
| `$guess` | `$gn` | Guess a random number within a range |
| `$math` | — | Solve a randomly generated math problem for coins |

### 🧠 Trivia & Quiz Games

| Command | Aliases | Description |
|---------|---------|-------------|
| `$trivia` | — | Answer multiple-choice questions from 150+ trivia questions across 6 categories: General Knowledge, Science & Nature, History & Culture, Pop Culture, Geography, and Math & Logic. Win coins for correct answers |
| `$emojiquiz` | `$quiz` | Guess what the emojis represent! 200+ puzzles across 12 categories: Movies, TV Shows, Songs, Food, Animals, Countries, Sports, Video Games, Brands, Celebrities, Concepts, and more. Supports multiple accepted answers |

### 🎲 Quick Games

| Command | Aliases | Description |
|---------|---------|-------------|
| `$rps` | `$rock` | Rock Paper Scissors with interactive buttons and animated results |
| `$tictactoe` | `$ttt` | Challenge another player to Tic-Tac-Toe with a button-based grid |
| `$8ball` | — | Ask the Magic 8-Ball a question and get a mystical answer |
| `$reaction` | `$react` | Test your reaction speed — click the button as fast as you can |
| `$wyr` | — | Would You Rather — vote on two options with buttons. Results shown with percentages after 60 seconds |

---

## 💰 Economy System

Earn, spend, and compete with a full virtual economy. All data persists across sessions.

| Command | Aliases | Description |
|---------|---------|-------------|
| `$balance` | `$bal`, `$bl` | Check your current coin balance |
| `$daily` | `$d`, `$dy` | Claim **500 coins** every 24 hours. Boosted by item multipliers |
| `$work` | `$w`, `$wk` | Work a random job (Programmer, Chef, Doctor, etc.) and earn **100–300 coins**. 1 hour cooldown. Boosted by item multipliers |
| `$transfer` | `$pay`, `$tf` | Send coins to another user (e.g. `$pay @user 100`) |
| `$shop` | `$sh`, `$store` | Browse the item shop — see prices, descriptions, and bonus multipliers |
| `$buy` | `$b` | Buy an item from the shop (e.g. `$buy laptop`) |
| `$inventory` | `$inv` | View your purchased items |
| `$leaderboard` | `$lb`, `$top` | See the richest users ranked by balance |

### � Multiplier System

Items you buy provide **permanent percentage bonuses** to your earnings:

- **Income multipliers** — Boost coin earnings from `$work`
- **Daily multipliers** — Boost coin earnings from `$daily`
- **Gamble multipliers** — Boost winnings from Blackjack, Poker, and other betting games

---

## 🛒 Shop & Items

| Item | Price | Bonus |
|------|-------|-------|
| 🍪 Cookies | 50 | +1% Daily Reward |
| 🎣 Fishing Rod | 500 | +2% Work Income |
| 📱 Phone | 1,000 | +5% Daily Reward |
| 🛡️ Shield | 1,000 | +3% Daily Reward |
| ⚔️ Sword | 1,500 | +5% Work Income |
| 💻 Laptop | 5,000 | +10% Work Income |
| 🍀 Lucky Clover | 7,777 | +7% Gambling Winnings |
| 👔 Business Suit | 10,000 | +20% Work Income |
| 🎫 Golden Ticket | 50,000 | +50% Daily Reward |

---

## � Utility Commands

| Command | Aliases | Description |
|---------|---------|-------------|
| `$ping` | `$p` | Check bot latency and API response time |
| `$avatar [user]` | `$av` | Display a user's avatar in full resolution. Defaults to yourself if no user specified |
| `$serverinfo` | — | View detailed server statistics (member count, channels, roles, creation date, etc.) |
| `$userinfo [user]` | `$user`, `$ui` | View detailed user info (account age, roles, join date, status, permissions, etc.) |

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

   For development with auto-restart on file changes:
   ```bash
   npm run dev
   ```

---

## 📁 Project Structure

```
bot-discord/
├── src/
│   ├── index.js              # Bot entry point, event handlers, command loader
│   ├── database.js            # SQLite database (users, giveaways, participants, guilds)
│   ├── commands/
│   │   ├── giveaway.js        # Giveaway management (start, end, reroll, pause, etc.)
│   │   ├── help.js            # Interactive help menu with category dropdown
│   │   ├── fun/               # 18 mini-game commands
│   │   │   ├── blackjack.js   #   Blackjack with betting
│   │   │   ├── poker.js       #   Multiplayer Texas Hold'em
│   │   │   ├── minesweeper.js #   Interactive grid minesweeper
│   │   │   ├── trivia.js      #   150+ trivia questions
│   │   │   ├── emojiquiz.js   #   200+ emoji puzzles
│   │   │   ├── hangman.js     #   Classic hangman (100+ words)
│   │   │   ├── scramble.js    #   Word scramble (8 categories)
│   │   │   ├── wordchain.js   #   Multiplayer word chain
│   │   │   └── ...            #   + 10 more games
│   │   ├── economy/           # 8 economy commands
│   │   │   ├── daily.js       #   Daily reward (500 coins, 24h cooldown)
│   │   │   ├── work.js        #   Work jobs (100-300 coins, 1h cooldown)
│   │   │   ├── shop.js        #   Browse item shop
│   │   │   ├── buy.js         #   Purchase items
│   │   │   └── ...            #   + 4 more economy commands
│   │   └── utility/           # 4 utility commands
│   │       ├── ping.js        #   Bot latency check
│   │       ├── avatar.js      #   User avatar display
│   │       ├── serverinfo.js  #   Server statistics
│   │       └── userinfo.js    #   User information
│   └── utils/
│       ├── embeds.js          # Embed builders, emojis & button constants
│       ├── timer.js           # Giveaway expiry timer (auto-ends & picks winners)
│       ├── pokerLogic.js      # Poker hand evaluation & deck management
│       ├── shopItems.js       # Shop item definitions & multiplier configs
│       └── multiplier.js      # Calculates user's total bonus multiplier from items
├── giveaways.db               # SQLite database file (auto-created)
├── package.json
└── .env                       # Environment variables (not committed)
```

---

## ⚙️ Tech Stack

| Technology | Purpose |
|------------|---------|
| [Node.js](https://nodejs.org/) ≥ 18 | JavaScript runtime |
| [discord.js](https://discord.js.org/) v14 | Discord API framework |
| [sql.js](https://github.com/sql-js/sql.js) | SQLite database (in-process, no native dependencies) |
| [ms](https://github.com/vercel/ms) | Human-readable duration parsing |
| [dotenv](https://github.com/motdotla/dotenv) | Environment variable management |

---

## 📝 License

This project is open source and available for personal use.
