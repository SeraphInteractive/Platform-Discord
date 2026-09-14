import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  ButtonInteraction,
} from 'discord.js';
import { apiClient } from '../api/client.js';
import { createSingleEntryEmbed, createEntryPaginationRow } from '../bot/embeds.js';
import { Entry, Round } from '../api/types.js';

export const data = new SlashCommandBuilder()
  .setName('entries')
  .setDescription('Browse candidate entries interactively with thumbnails, media, and creator bios')
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
    const [round, entries] = await Promise.all([
      apiClient.getRound(roundId),
      apiClient.getEntries(roundId),
    ]);

    if (!entries || entries.length === 0) {
      await interaction.editReply({
        content: `ℹ️ No candidate entries found for round **${round.title}**.`,
      });
      return;
    }

    const initialIndex = 0;
    const embed = createSingleEntryEmbed(round, entries[initialIndex], initialIndex, entries.length);
    const row = createEntryPaginationRow(initialIndex, entries.length, round.id);

    await interaction.editReply({
      embeds: [embed],
      components: [row],
    });
  } catch (error: any) {
    await interaction.editReply({
      content: `❌ **Failed to retrieve entries:** ${error.message || 'Error fetching entries.'}`,
    });
  }
}

/**
 * Handles interactive button pagination clicks for entries
 */
export async function handleEntryPagination(interaction: ButtonInteraction, round: Round, entries: Entry[]) {
  const customId = interaction.customId; // e.g. "entry_next:uuid:2" or "entry_first:uuid"
  const parts = customId.split(':');
  const action = parts[0];
  const targetIndexStr = parts[2];

  let targetIndex = 0;
  if (action === 'entry_first') {
    targetIndex = 0;
  } else if (action === 'entry_last') {
    targetIndex = entries.length - 1;
  } else if (targetIndexStr !== undefined) {
    targetIndex = parseInt(targetIndexStr, 10);
  }

  if (isNaN(targetIndex) || targetIndex < 0) targetIndex = 0;
  if (targetIndex >= entries.length) targetIndex = entries.length - 1;

  const embed = createSingleEntryEmbed(round, entries[targetIndex], targetIndex, entries.length);
  const row = createEntryPaginationRow(targetIndex, entries.length, round.id);

  await interaction.update({
    embeds: [embed],
    components: [row],
  });
}
