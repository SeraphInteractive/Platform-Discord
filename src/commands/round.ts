import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  AutocompleteInteraction,
} from 'discord.js';
import { apiClient } from '../api/client.js';
import { createRoundDetailEmbed, createVoteButtonRow } from '../bot/embeds.js';
import {
  handleRoundAutocomplete,
  fetchSortedRounds,
  createRoundSelectMenu,
  sortEntriesByDate,
} from '../bot/round-selector.js';
import { Entry } from '../api/types.js';

export const data = new SlashCommandBuilder()
  .setName('round')
  .setDescription('View specification, schedule, and entries for a voting round')
  .addStringOption((option) =>
    option
      .setName('round')
      .setDescription('Select a voting round (or leave blank to pick from list)')
      .setAutocomplete(true)
      .setRequired(false)
  );

export async function autocomplete(interaction: AutocompleteInteraction) {
  await handleRoundAutocomplete(interaction);
}

export async function execute(interaction: ChatInputCommandInteraction) {
  const roundId = interaction.options.getString('round')?.trim();

  if (!roundId) {
    await interaction.deferReply();
    try {
      const rounds = await fetchSortedRounds();
      if (rounds.length === 0) {
        await interaction.editReply({
          content: 'No registered voting rounds found.',
        });
        return;
      }
      const selectRow = createRoundSelectMenu('round', rounds, 'Select a round to view details...');
      await interaction.editReply({
        content: '**SELECT VOTING ROUND**\nChoose a round from the dropdown menu:',
        components: [selectRow],
      });
    } catch (error: any) {
      await interaction.editReply({
        content: `**ERROR:** Failed to fetch rounds list: ${error.message || 'API unreachable.'}`,
      });
    }
    return;
  }

  await interaction.deferReply();

  try {
    const [round, rawEntries] = await Promise.all([
      apiClient.getRound(roundId),
      apiClient.getEntries(roundId).catch(() => [] as Entry[]),
    ]);

    const entries = sortEntriesByDate(rawEntries);
    const embed = createRoundDetailEmbed(round, entries);
    const row = createVoteButtonRow(round.id);

    await interaction.editReply({ embeds: [embed], components: [row] });
  } catch (error: any) {
    await interaction.editReply({
      content: `**ERROR:** Failed to retrieve round: ${error.message || 'Round not found.'}`,
    });
  }
}
