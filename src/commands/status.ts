import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
} from 'discord.js';
import { config } from '../config.js';
import { channelStore } from '../storage/channel-store.js';

export const data = new SlashCommandBuilder()
  .setName('bot-status')
  .setDescription('Check bot gateway ping, voting API target, and active announcement channels')
  .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers);

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  const client = interaction.client;
  const latency = client.ws.ping;
  const announcementChannelId = channelStore.getAnnouncementChannelId();
  const telemetryChannelId = channelStore.getTelemetryAlertChannelId();

  const announcementText = announcementChannelId
    ? `<#${announcementChannelId}> (\`${announcementChannelId}\`)`
    : '*Not configured (use /set-announcement-channel)*';

  const telemetryText = telemetryChannelId
    ? `<#${telemetryChannelId}> (\`${telemetryChannelId}\`)`
    : '*Not configured (use /set-announcement-channel)*';

  const statusText =
    `🤖 **MCM² Read-Only Bot & Worker Status**\n\n` +
    `• **Gateway Ping:** \`${latency >= 0 ? `${latency}ms` : 'Connecting...'}\`\n` +
    `• **Voting API Target:** \`${config.apiBaseUrl}\`\n` +
    `• **Web Studio Target:** \`${config.webAppUrl}\`\n` +
    `• **API Bearer Token:** \`${config.apiBearerToken ? 'Configured ✅' : 'Missing ⚠️'}\`\n` +
    `• **Winner Channel:** ${announcementText}\n` +
    `• **Raid Alert Channel:** ${telemetryText}\n` +
    `• **SSE Poll Interval:** \`${config.ssePollIntervalMs}ms\`\n` +
    `• **Operational Mode:** \`Read-Only Client (No direct DB mutation)\``;

  await interaction.editReply({ content: statusText });
}
