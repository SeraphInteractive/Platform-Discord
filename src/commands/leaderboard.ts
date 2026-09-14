import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  AutocompleteInteraction,
} from 'discord.js';
import { apiClient } from '../api/client.js';
import { createLeaderboardEmbed, createVoteButtonRow } from '../bot/embeds.js';
import {
  handleRoundAutocomplete,
  fetchSortedRounds,
  createRoundSelectMenu,
} from '../bot/round-selector.js';
import { Entry } from '../api/types.js';

export const data = new SlashCommandBuilder()
  .setName('leaderboard')
  .setDescription('View live regularized standings and score matrix for a round')
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
      const selectRow = createRoundSelectMenu('leaderboard', rounds, 'Select a round to view leaderboard...');
      await interaction.editReply({
        content: '**VIEW LIVE LEADERBOARD**\nChoose a round from the dropdown menu:',
        components: [selectRow],
      });
    } catch (error: any) {
      await interaction.editReply({
        content: `**ERROR:** Failed to fetch rounds: ${error.message || 'API unreachable.'}`,
      });
    }
    return;
  }

  await interaction.deferReply();

  try {
    const [round, leaderboardData, entries] = await Promise.all([
      apiClient.getRound(roundId),
      apiClient.getLeaderboard(roundId),
      apiClient.getEntries(roundId).catch(() => [] as Entry[]),
    ]);

    const entriesMap = new Map<string, Entry>();
    for (const entry of entries) {
      entriesMap.set(entry.id, entry);
    }

    const embed = createLeaderboardEmbed(round, leaderboardData, entriesMap);
    const row = createVoteButtonRow(round.id);

    await interaction.editReply({ embeds: [embed], components: [row] });
  } catch (error: any) {
    await interaction.editReply({
      content: `**ERROR:** Failed to retrieve leaderboard: ${error.message || 'Error computing or fetching leaderboard.'}`,
    });
  }
}
