import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
} from 'discord.js';
import { createRoundsEmbed } from '../bot/embeds.js';
import { fetchSortedRounds } from '../bot/round-selector.js';
import { RoundStatus } from '../api/types.js';

export const data = new SlashCommandBuilder()
  .setName('rounds')
  .setDescription('List all voting rounds in the platform')
  .addStringOption((option) =>
    option
      .setName('status')
      .setDescription('Filter rounds by lifecycle status')
      .setRequired(false)
      .addChoices(
        { name: 'Open (Active Voting)', value: 'open' },
        { name: 'Closed (Awaiting Finalization)', value: 'closed' },
        { name: 'Finalized (Results Published)', value: 'finalized' },
        { name: 'Draft (Upcoming)', value: 'draft' }
      )
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  try {
    const status = interaction.options.getString('status') as RoundStatus | null;
    const rounds = await fetchSortedRounds(status || undefined, true);
    const embed = createRoundsEmbed(rounds);

    await interaction.editReply({ embeds: [embed] });
  } catch (error: any) {
    await interaction.editReply({
      content: `**ERROR:** Failed to fetch rounds: ${error.message || 'API unreachable.'}`,
    });
  }
}
