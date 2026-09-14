# Platform Discord Bot & Worker

> **Read-only Discord Bot & SSE Event Worker** for the platform ranked voting ecosystem.

---

## Architecture Overview

The Discord Bot is designed to be **strictly read-only** for community members and staff:
- Voters cast and update ballots securely on the Web Studio via Discord OAuth.
- The Discord bot interfaces with the **AdonisJS Voting API** (`vote-api`) via REST endpoints and real-time Server-Sent Events (SSE).
- Provides live telemetry, regularized Bayesian leaderboards, interactive candidate browsing, statistical separation proofs, and automated winner announcements.

```
                  ┌───────────────────────────────────────────────┐
                  │                  Discord API                  │
                  └───────────────────────▲───────────────────────┘
                                          │ (Gateway & Slash Cmds)
                  ┌───────────────────────┴───────────────────────┐
                  │               Platform Discord Bot            │
                  │                                               │
                  │  ┌──────────────────────┐  ┌────────────────┐ │
                  │  │    Slash Commands    │  │   SSE Worker   │ │
                  │  │  /rounds             │  │  - raid:alert  │ │
                  │  │  /round <id>         │  │  - announcements││
                  │  │  /entries <id> (paged│  └───────▲────────┘ │
                  │  │  /leaderboard <id>   │          │          │
                  │  │  /results <id>       │          │          │
                  │  │  /telemetry <id>     │          │          │
                  │  │  /set-announcement...│          │          │
                  │  └──────────┬───────────┘          │          │
                  │             │                      │          │
                  │  ┌──────────▼──────────────────────┴────────┐ │
                  │  │             API Client (/api/v1)         │ │
                  │  └──────────────────────▲───────────────────┘ │
                  └─────────────────────────┼─────────────────────┘
                                            │ HTTP REST & SSE
                  ┌─────────────────────────▼─────────────────────┐
                  │       vote-api (AdonisJS 6 API Backend)       │
                  └───────────────────────────────────────────────┘
```

---

## Slash Commands

| Command | Permission | Description |
| :--- | :--- | :--- |
| `/rounds [status]` | Public | Lists all voting rounds with lifecycle status badges (`Open`, `Closed`, `Finalized`, `Draft`). |
| `/round <id>` | Public | Detailed round overview, candidate count, timeline, and direct button link to vote on the web. |
| `/entries <round_id>` | Public | **Interactive candidate browser** with thumbnails, banners, descriptions, and Next/Previous page buttons. |
| `/leaderboard <round_id>` | Public | Live standings showing raw Borda points, Empirical Bayesian regularized score, and 6N conservation checks. |
| `/results <round_id>` | Public | Official finalized results, gold/silver/bronze podium, and Paired Z-Score hypothesis rank separation proofs. |
| `/telemetry <round_id>` | Moderators | Ephemeral telemetry report on rolling velocity Z-scores, skew ratio, rank entropy, and automated quarantine flags. |
| `/set-announcement-channel` | Moderators | Dynamically configures channels for **Official Winner Announcements** and **Raid Telemetry Alerts**. |
| `/bot-status` | Moderators | Displays bot latency, voting API target, and active channel routes. |

---

## Automated Background Worker

- **Live Raid Alerts**: Subscribes to the `/api/v1/rounds/:id/events` SSE stream. If an anomalous velocity spike (`Z >= 3.0σ`) triggers an automated quarantine, an alert embed is immediately dispatched to the configured moderator alert channel.
- **Winner Proclamations**: When a round transitions to `finalized`, the worker automatically fetches the verified results and broadcasts a theatrical winner announcement to the configured public announcement channel.

---

## Setup & Installation

### 1. Prerequisites
- Node.js v20+ or v22+
- Discord Bot Application credentials from the [Discord Developer Portal](https://discord.com/developers/applications)

### 2. Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Configure the following variables in `.env`:
```ini
# Discord Bot
DISCORD_BOT_TOKEN=your_bot_token_here
DISCORD_CLIENT_ID=your_application_client_id_here
DISCORD_GUILD_ID=your_guild_id_here   # Optional: set for instant command sync in dev

# API & Web App
API_BASE_URL=http://localhost:3333/api/v1
WEB_APP_URL=http://localhost:3000
API_BEARER_TOKEN=your_bearer_token_here
```

### 3. Install & Build
```bash
# Install dependencies
npm install

# Typecheck and build TypeScript
npm run typecheck
npm run build
```

### 4. Deploy Slash Commands to Discord
```bash
npm run deploy:commands
```

### 5. Start the Bot
```bash
# Development mode with hot-reloading
npm run dev

# Or Production mode
npm start
```

---

## License
MIT License. Part of the Platform ecosystem.
