# syntax=docker/dockerfile:1.7

# Production image for the Platform Discord bot & SSE worker.
#   build: docker build -t platform-discord .
#   run:   docker run --rm --env-file .env -v bot_data:/app/data platform-discord
# Published to ghcr.io/seraphinteractive/platform-discord by .github/workflows/docker-publish.yml.

ARG NODE_VERSION=24

FROM node:${NODE_VERSION}-alpine AS base
WORKDIR /app

# all dependencies (typescript compiler)
FROM base AS deps
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --no-audit --no-fund

# production dependencies only
FROM base AS production-deps
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev --no-audit --no-fund

# compile typescript into dist/
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY package.json tsconfig.json ./
COPY src ./src
RUN npm run build

# lean runtime image
FROM node:${NODE_VERSION}-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --chown=node:node package.json ./
COPY --chown=node:node --from=production-deps /app/node_modules ./node_modules
COPY --chown=node:node --from=build /app/dist ./dist
# channel settings written by /set-announcement-channel live here: mount a volume on /app/data
RUN mkdir -p /app/data && chown node:node /app/data
USER node

# register slash commands once per deployment: `node dist/bot/deploy-commands.js`
CMD ["node", "dist/index.js"]
