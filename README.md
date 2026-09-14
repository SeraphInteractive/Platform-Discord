# Platform Discord Service

Discord bot integration and real-time event worker for community rankings, telemetry, and automated announcements.

## Features
- Slash commands for browsing rounds, entries, leaderboards, and results.
- Automated background worker listening to SSE events for real-time announcements and alerts.
- Permission-gated moderator tooling and channel configuration.

## Setup

1. Copy environment file and configure credentials:
```bash
cp .env.example .env
```

2. Install dependencies:
```bash
npm install
```

3. Register slash commands:
```bash
npm run deploy:commands
```

4. Build and start:
```bash
npm run build
npm start
```

## License
MIT
