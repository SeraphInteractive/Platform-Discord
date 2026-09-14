import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
} from 'discord.js';
import { apiClient } from '../api/client.js';
import { createTelemetryEmbed } from '../bot/embeds.js';
import { Entry, EntryTelemetry, RoundTelemetrySummary } from '../api/types.js';

export const data = new SlashCommandBuilder()
  .setName('telemetry')
  .setDescription('🛡️ View raid telemetry, velocity Z-scores, and quarantine flags (Moderators only)')
  .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
  .addStringOption((option) =>
    option
      .setName('round_id')
      .setDescription('The UUID of the voting round')
      .setRequired(true)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  // Ephemeral reply so telemetry stays staff-only
  await interaction.deferReply({ ephemeral: true });

  const roundId = interaction.options.getString('round_id', true).trim();

  try {
    const [round, telemetryData, entries] = await Promise.all([
      apiClient.getRound(roundId),
      apiClient.getRoundTelemetry(roundId),
      apiClient.getEntries(roundId).catch(() => [] as Entry[]),
    ]);

    const entriesMap = new Map<string, Entry>();
    for (const entry of entries) {
      entriesMap.set(entry.id, entry);
    }

    let telemetryList: EntryTelemetry[] = [];
    if (Array.isArray(telemetryData)) {
      telemetryList = telemetryData;
    } else if (telemetryData && Array.isArray((telemetryData as RoundTelemetrySummary).telemetry)) {
      telemetryList = (telemetryData as RoundTelemetrySummary).telemetry;
    }

    const embed = createTelemetryEmbed(round, telemetryList, entriesMap);
    await interaction.editReply({ embeds: [embed] });
  } catch (error: any) {
    await interaction.editReply({
      content: `❌ **Failed to retrieve telemetry:** ${error.message || 'Error fetching telemetry data. Verify API token is configured with moderator permissions.'}`,
    });
  }
}
