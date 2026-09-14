import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
} from 'discord.js';
import { config, isAuthorizedAdmin } from '../config.js';
import { channelStore } from '../storage/channel-store.js';

export const data = new SlashCommandBuilder()
  .setName('bot-status')
  .setDescription('System telemetry: gateway latency, API target, and worker routing (Authorized staff only)')
  .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers);

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  if (!isAuthorizedAdmin(interaction.user.id)) {
    await interaction.editReply({
      content: '`[ACCESS DENIED]` You are not authorized to view bot diagnostics.',
    });
    return;
  }

  const client = interaction.client;
  const latency = client.ws.ping;
  const announcementChannelId = channelStore.getAnnouncementChannelId();
  const telemetryChannelId = channelStore.getTelemetryAlertChannelId();

  const announcementText = announcementChannelId
    ? `<#${announcementChannelId}> (\`${announcementChannelId}\`)`
    : '`[NOT CONFIGURED]`';

  const telemetryText = telemetryChannelId
    ? `<#${telemetryChannelId}> (\`${telemetryChannelId}\`)`
    : '`[NOT CONFIGURED]`';

  const statusText =
    `**SYSTEM DIAGNOSTICS: DISCORD WORKER & EVENT PIPELINE**\n\n` +
    '```\n' +
    `Gateway Ping Latency : ${latency >= 0 ? `${latency}ms` : 'Connecting...'}\n` +
    `API Backend Target   : ${config.apiBaseUrl}\n` +
    `Web Platform Target  : ${config.webAppUrl}\n` +
    `API Token Status     : ${config.apiBearerToken ? 'ACTIVE' : 'NONE (ANONYMOUS)'}\n` +
    `SSE Polling Window   : ${config.ssePollIntervalMs}ms\n` +
    `Operational Mode     : READ_ONLY_CLIENT\n` +
    '```\n' +
    `- Announcements Channel : ${announcementText}\n` +
    `- Telemetry Alert Stream : ${telemetryText}`;

  await interaction.editReply({ content: statusText });
}
