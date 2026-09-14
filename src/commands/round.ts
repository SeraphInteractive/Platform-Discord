import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
} from 'discord.js';
import { apiClient } from '../api/client.js';
import { createRoundDetailEmbed, createVoteButtonRow } from '../bot/embeds.js';

export const data = new SlashCommandBuilder()
  .setName('round')
  .setDescription('View detailed information, timelines, and candidate preview for a specific voting round')
  .addStringOption((option) =>
    option
      .setName('id')
      .setDescription('The UUID of the voting round')
      .setRequired(true)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const roundId = interaction.options.getString('id', true).trim();

  try {
    const [round, entries] = await Promise.all([
      apiClient.getRound(roundId),
      apiClient.getEntries(roundId).catch(() => []),
    ]);

    const embed = createRoundDetailEmbed(round, entries);
    const row = createVoteButtonRow(round.id);

    await interaction.editReply({ embeds: [embed], components: [row] });
  } catch (error: any) {
    await interaction.editReply({
      content: `❌ **Failed to retrieve round:** ${error.message || 'Round not found or API unavailable.'}`,
    });
  }
}
