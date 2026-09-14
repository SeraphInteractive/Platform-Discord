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

## Docker

`Dockerfile` builds a production image that runs as the unprivileged `node` user.
`.github/workflows/docker-publish.yml` publishes it to `ghcr.io/seraphinteractive/platform-discord`
on every push to `main` (`latest`, `main`, `sha-<short>`) and on `v*.*.*` tags (`X.Y.Z`, `X.Y`);
pull requests only build.

```bash
docker build -t platform-discord .
# /app/data holds the channel settings chosen with /set-announcement-channel: keep it on a volume
docker run --rm --env-file .env -v bot_data:/app/data platform-discord
# register slash commands from inside the image (no tsx needed)
docker run --rm --env-file .env platform-discord node dist/bot/deploy-commands.js
```

The production stack (API, Postgres, Redis, Dokploy) lives in
[Platform-Deployment](https://github.com/SeraphInteractive/Platform-Deployment).

## License
MIT
