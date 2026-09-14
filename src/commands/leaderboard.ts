import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
} from 'discord.js';
import { apiClient } from '../api/client.js';
import { createLeaderboardEmbed, createVoteButtonRow } from '../bot/embeds.js';
import { Entry } from '../api/types.js';

export const data = new SlashCommandBuilder()
  .setName('leaderboard')
  .setDescription('View the live regularized standings and score matrix for an active round')
  .addStringOption((option) =>
    option
      .setName('round_id')
      .setDescription('The UUID of the voting round')
      .setRequired(true)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const roundId = interaction.options.getString('round_id', true).trim();

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
      content: `❌ **Failed to retrieve leaderboard:** ${error.message || 'Error computing or fetching leaderboard.'}`,
    });
  }
}
