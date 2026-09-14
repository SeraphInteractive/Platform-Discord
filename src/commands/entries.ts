import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  ButtonInteraction,
  AutocompleteInteraction,
} from 'discord.js';
import { apiClient } from '../api/client.js';
import { createSingleEntryEmbed, createEntryPaginationRow } from '../bot/embeds.js';
import {
  handleRoundAutocomplete,
  fetchSortedRounds,
  createRoundSelectMenu,
  sortEntriesByDate,
} from '../bot/round-selector.js';
import { Entry, Round } from '../api/types.js';

export const data = new SlashCommandBuilder()
  .setName('entries')
  .setDescription('Browse candidate entries with media preview and author attribution')
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
      const selectRow = createRoundSelectMenu('entries', rounds, 'Select a round to browse entries...');
      await interaction.editReply({
        content: '**BROWSE CANDIDATE ENTRIES**\nChoose a round from the dropdown menu:',
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
    const [round, rawEntries] = await Promise.all([
      apiClient.getRound(roundId),
      apiClient.getEntries(roundId),
    ]);

    const entries = sortEntriesByDate(rawEntries);

    if (!entries || entries.length === 0) {
      await interaction.editReply({
        content: `No candidate entries found for round: **${round.title}**.`,
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
      content: `**ERROR:** Failed to retrieve entries: ${error.message || 'Error fetching entries.'}`,
    });
  }
}

/**
 * Handles interactive button pagination clicks for entries
 */
export async function handleEntryPagination(interaction: ButtonInteraction, round: Round, rawEntries: Entry[]) {
  const entries = sortEntriesByDate(rawEntries);
  const customId = interaction.customId;
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
