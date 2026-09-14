import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  ChannelType,
} from 'discord.js';
import { channelStore } from '../storage/channel-store.js';
import { isAuthorizedAdmin } from '../config.js';

export const data = new SlashCommandBuilder()
  .setName('set-announcement-channel')
  .setDescription('Configure notification channels for announcements and alerts (Staff only)')
  .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
  .addChannelOption((option) =>
    option
      .setName('channel')
      .setDescription('The text channel to route automated updates to')
      .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
      .setRequired(true)
  )
  .addStringOption((option) =>
    option
      .setName('type')
      .setDescription('Category of notifications for this channel')
      .setRequired(true)
      .addChoices(
        { name: 'Official Winner Announcements', value: 'winners' },
        { name: 'Live Raid & Velocity Alerts', value: 'alerts' },
        { name: 'All Automated Broadcasts', value: 'all' }
      )
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  if (!isAuthorizedAdmin(interaction.user.id)) {
    await interaction.editReply({
      content: '`[ACCESS DENIED]` You are not authorized to configure announcement channels.',
    });
    return;
  }

  const channel = interaction.options.getChannel('channel', true);
  const type = interaction.options.getString('type', true);
  const userTag = interaction.user.tag;

  if (type === 'winners' || type === 'all') {
    channelStore.setAnnouncementChannel(channel.id, userTag);
  }
  if (type === 'alerts' || type === 'all') {
    channelStore.setTelemetryAlertChannel(channel.id, userTag);
  }

  const responseMessages: string[] = [];
  if (type === 'winners' || type === 'all') {
    responseMessages.push(`- Winner Proclamations: <#${channel.id}>`);
  }
  if (type === 'alerts' || type === 'all') {
    responseMessages.push(`- Security & Telemetry Alerts: <#${channel.id}>`);
  }

  await interaction.editReply({
    content:
      `**AUTOMATED CHANNEL ROUTING CONFIGURED**\n\n` +
      responseMessages.join('\n') +
      `\n\n*Configuration persisted to channel store.*`,
  });
}
