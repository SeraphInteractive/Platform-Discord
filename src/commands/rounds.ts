import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
} from 'discord.js';
import { apiClient } from '../api/client.js';
import { createRoundsEmbed } from '../bot/embeds.js';
import { RoundStatus } from '../api/types.js';

export const data = new SlashCommandBuilder()
  .setName('rounds')
  .setDescription('List all voting rounds in the MCM² voting studio')
  .addStringOption((option) =>
    option
      .setName('status')
      .setDescription('Filter rounds by lifecycle status')
      .setRequired(false)
      .addChoices(
        { name: '🟢 Open (Active Voting)', value: 'open' },
        { name: '🟡 Closed (Awaiting Finalization)', value: 'closed' },
        { name: '🟣 Finalized (Results Published)', value: 'finalized' },
        { name: '⚪ Draft (Upcoming)', value: 'draft' }
      )
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  try {
    const status = interaction.options.getString('status') as RoundStatus | null;
    const rounds = await apiClient.getRounds(status || undefined);
    const embed = createRoundsEmbed(rounds);

    await interaction.editReply({ embeds: [embed] });
  } catch (error: any) {
    await interaction.editReply({
      content: `❌ **Failed to fetch rounds:** ${error.message || 'Unknown error contacting API.'}`,
    });
  }
}
