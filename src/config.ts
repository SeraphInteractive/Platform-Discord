import dotenv from 'dotenv';
dotenv.config();

export interface BotConfig {
  discordToken: string;
  clientId: string;
  guildId?: string;
  apiBaseUrl: string;
  webAppUrl: string;
  apiBearerToken: string;
  defaultAnnouncementChannelId?: string;
  defaultTelemetryAlertChannelId?: string;
  ssePollIntervalMs: number;
}

export function loadConfig(): BotConfig {
  const discordToken = process.env.DISCORD_BOT_TOKEN || '';
  const clientId = process.env.DISCORD_CLIENT_ID || '';
  const guildId = process.env.DISCORD_GUILD_ID ? process.env.DISCORD_GUILD_ID.trim() : undefined;
  const apiBaseUrl = (process.env.API_BASE_URL || 'http://localhost:3333/api/v1').replace(/\/+$/, '');
  const webAppUrl = (process.env.WEB_APP_URL || 'http://localhost:3000').replace(/\/+$/, '');
  const apiBearerToken = process.env.API_BEARER_TOKEN || '';
  const defaultAnnouncementChannelId = process.env.ANNOUNCEMENT_CHANNEL_ID || undefined;
  const defaultTelemetryAlertChannelId = process.env.TELEMETRY_ALERT_CHANNEL_ID || undefined;
  const ssePollIntervalMs = parseInt(process.env.SSE_POLL_INTERVAL_MS || '15000', 10);

  return {
    discordToken,
    clientId,
    guildId: guildId || undefined,
    apiBaseUrl,
    webAppUrl,
    apiBearerToken,
    defaultAnnouncementChannelId,
    defaultTelemetryAlertChannelId,
    ssePollIntervalMs,
  };
}

export const config = loadConfig();
