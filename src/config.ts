import dotenv from 'dotenv';
dotenv.config();

export const HARDCODED_ADMIN_DISCORD_IDS: readonly string[] = [
  '215537065863938049',
  '212401207694721024',
  '965511204372086814',
  '364539598942240768',
];

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
  adminDiscordIds: Set<string>;
  observerRoleId: string;
  contributorRoleId: string;
  inviteUrl: string;
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

  const envAdminIds = (process.env.ADMIN_DISCORD_IDS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const adminDiscordIds = new Set([...HARDCODED_ADMIN_DISCORD_IDS, ...envAdminIds]);

  const observerRoleId = process.env.DISCORD_OBSERVER_ROLE_ID || '1548188404083204196';
  const contributorRoleId = process.env.DISCORD_CONTRIBUTOR_ROLE_ID || '1548188314970882150';
  const inviteUrl = process.env.DISCORD_INVITE_URL || 'https://discord.gg/xwetf5cg6c';

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
    adminDiscordIds,
    observerRoleId,
    contributorRoleId,
    inviteUrl,
  };
}

export const config = loadConfig();

export function isAuthorizedAdmin(userId: string): boolean {
  return config.adminDiscordIds.has(userId);
}
