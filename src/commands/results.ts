import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  AutocompleteInteraction,
} from 'discord.js';
import { apiClient } from '../api/client.js';
import { createResultsEmbed } from '../bot/embeds.js';
import {
  handleRoundAutocomplete,
  fetchSortedRounds,
  createRoundSelectMenu,
} from '../bot/round-selector.js';
import { Entry } from '../api/types.js';

export const data = new SlashCommandBuilder()
  .setName('results')
  .setDescription('View audited finalized results, podium, and rank separation proofs')
  .addStringOption((option) =>
    option
      .setName('round')
      .setDescription('Select a finalized voting round (or leave blank to pick from list)')
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
      const finalizedRounds = rounds.filter((r) => r.status === 'finalized');
      const targetRounds = finalizedRounds.length > 0 ? finalizedRounds : rounds;

      if (targetRounds.length === 0) {
        await interaction.editReply({
          content: 'No voting rounds found.',
        });
        return;
      }
      const selectRow = createRoundSelectMenu('results', targetRounds, 'Select a round to view results...');
      await interaction.editReply({
        content: '**VIEW FINALIZED RESULTS**\nChoose a round from the dropdown menu:',
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
    const [round, resultsData, entries] = await Promise.all([
      apiClient.getRound(roundId),
      apiClient.getResults(roundId),
      apiClient.getEntries(roundId).catch(() => [] as Entry[]),
    ]);

    const entriesMap = new Map<string, Entry>();
    for (const entry of entries) {
      entriesMap.set(entry.id, entry);
    }

    const embed = createResultsEmbed(round, resultsData, entriesMap);
    await interaction.editReply({ embeds: [embed] });
  } catch (error: any) {
    await interaction.editReply({
      content: `**ERROR:** Failed to retrieve finalized results: ${error.message || 'Results unavailable.'}`,
    });
  }
}
