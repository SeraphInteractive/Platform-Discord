import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  AutocompleteInteraction,
} from 'discord.js';
import { apiClient } from '../api/client.js';
import { createTelemetryEmbed } from '../bot/embeds.js';
import { Entry, EntryTelemetry, RoundTelemetrySummary } from '../api/types.js';
import { isAuthorizedAdmin } from '../config.js';
import {
  handleRoundAutocomplete,
  fetchSortedRounds,
  createRoundSelectMenu,
} from '../bot/round-selector.js';

export const data = new SlashCommandBuilder()
  .setName('telemetry')
  .setDescription('View voting velocity and anomaly flags (Staff only)')
  .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
  .addStringOption((option) =>
    option
      .setName('round')
      .setDescription('Select a voting round (or leave blank to pick from list)')
      .setAutocomplete(true)
      .setRequired(false)
  );

export async function autocomplete(interaction: AutocompleteInteraction) {
  if (!isAuthorizedAdmin(interaction.user.id)) {
    await interaction.respond([]);
    return;
  }
  await handleRoundAutocomplete(interaction);
}

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  if (!isAuthorizedAdmin(interaction.user.id)) {
    await interaction.editReply({
      content: '`[ACCESS DENIED]` You are not authorized to view telemetry data.',
    });
    return;
  }

  const roundId = interaction.options.getString('round')?.trim();

  if (!roundId) {
    try {
      const rounds = await fetchSortedRounds();
      if (rounds.length === 0) {
        await interaction.editReply({
          content: 'No registered voting rounds found.',
        });
        return;
      }
      const selectRow = createRoundSelectMenu('telemetry', rounds, 'Select a round to view telemetry...');
      await interaction.editReply({
        content: '**TELEMETRY & ANOMALY ANALYSIS**\nChoose a round from the dropdown menu:',
        components: [selectRow],
      });
    } catch (error: any) {
      await interaction.editReply({
        content: `**ERROR:** Failed to fetch rounds: ${error.message || 'API unreachable.'}`,
      });
    }
    return;
  }

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
      content: `**ERROR:** Failed to retrieve telemetry: ${error.message || 'Error fetching telemetry data.'}`,
    });
  }
}
