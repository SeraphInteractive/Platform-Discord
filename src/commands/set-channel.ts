import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  ChannelType,
} from 'discord.js';
import { channelStore } from '../storage/channel-store.js';

export const data = new SlashCommandBuilder()
  .setName('set-announcement-channel')
  .setDescription('⚙️ Configure automated Discord channels for winner proclamations and raid alerts')
  .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
  .addChannelOption((option) =>
    option
      .setName('channel')
      .setDescription('The text channel to send automated updates to')
      .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
      .setRequired(true)
  )
  .addStringOption((option) =>
    option
      .setName('type')
      .setDescription('The category of notifications for this channel')
      .setRequired(true)
      .addChoices(
        { name: '🏆 Official Winner Announcements', value: 'winners' },
        { name: '🚨 Live Raid & Velocity Alerts', value: 'alerts' },
        { name: '✨ All Automated Broadcasts', value: 'all' }
      )
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

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
    responseMessages.push(`• **Official Winner Announcements** ➔ <#${channel.id}>`);
  }
  if (type === 'alerts' || type === 'all') {
    responseMessages.push(`• **Live Raid & Anomaly Alerts** ➔ <#${channel.id}>`);
  }

  await interaction.editReply({
    content:
      `✅ **Automated Channels Updated Successfully!**\n\n` +
      responseMessages.join('\n') +
      `\n\n*Changes are active immediately and saved across bot restarts.*`,
  });
}
