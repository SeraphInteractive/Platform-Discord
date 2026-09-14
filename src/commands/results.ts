import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
} from 'discord.js';
import { apiClient } from '../api/client.js';
import { createResultsEmbed } from '../bot/embeds.js';
import { Entry } from '../api/types.js';

export const data = new SlashCommandBuilder()
  .setName('results')
  .setDescription('View official finalized results, podium, and hypothesis rank separation proofs')
  .addStringOption((option) =>
    option
      .setName('round_id')
      .setDescription('The UUID of the finalized voting round')
      .setRequired(true)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const roundId = interaction.options.getString('round_id', true).trim();

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
      content: `❌ **Failed to retrieve finalized results:** ${error.message || 'Round may not be finalized yet, or results are unavailable.'}`,
    });
  }
}
