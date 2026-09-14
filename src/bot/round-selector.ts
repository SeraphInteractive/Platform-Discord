import {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  AutocompleteInteraction,
  StringSelectMenuInteraction,
} from 'discord.js';
import { apiClient } from '../api/client.js';
import { Round, RoundStatus, Entry } from '../api/types.js';
import { isAuthorizedAdmin } from '../config.js';
import {
  createRoundDetailEmbed,
  createVoteButtonRow,
  createSingleEntryEmbed,
  createEntryPaginationRow,
  createLeaderboardEmbed,
  createResultsEmbed,
  createTelemetryEmbed,
} from './embeds.js';

interface CachedRounds {
  data: Round[];
  timestamp: number;
}

let cachedRounds: CachedRounds | null = null;
const CACHE_TTL_MS = 15000; // 15 seconds cache for snappy autocomplete

/**
 * Sorts rounds: active (open) first, then newest opensAt/createdAt descending
 */
export function sortRoundsByDate(rounds: Round[]): Round[] {
  return [...rounds].sort((a, b) => {
    if (a.status === 'open' && b.status !== 'open') return -1;
    if (b.status === 'open' && a.status !== 'open') return 1;

    const timeA = new Date(a.opensAt || a.createdAt || 0).getTime();
    const timeB = new Date(b.opensAt || b.createdAt || 0).getTime();
    return timeB - timeA;
  });
}

/**
 * Sorts entries: newest submission date (createdAt) descending
 */
export function sortEntriesByDate(entries: Entry[]): Entry[] {
  return [...entries].sort((a, b) => {
    const timeA = new Date(a.createdAt || 0).getTime();
    const timeB = new Date(b.createdAt || 0).getTime();
    return timeB - timeA;
  });
}

/**
 * Fetches rounds with caching and sorting by date
 */
export async function fetchSortedRounds(statusFilter?: RoundStatus, forceRefresh = false): Promise<Round[]> {
  const now = Date.now();
  if (!forceRefresh && cachedRounds && now - cachedRounds.timestamp < CACHE_TTL_MS) {
    if (statusFilter) {
      return cachedRounds.data.filter((r) => r.status === statusFilter);
    }
    return cachedRounds.data;
  }

  try {
    const rounds = await apiClient.getRounds();
    const sorted = sortRoundsByDate(rounds);
    cachedRounds = { data: sorted, timestamp: now };

    if (statusFilter) {
      return sorted.filter((r) => r.status === statusFilter);
    }
    return sorted;
  } catch (error) {
    if (cachedRounds) {
      return statusFilter ? cachedRounds.data.filter((r) => r.status === statusFilter) : cachedRounds.data;
    }
    throw error;
  }
}

/**
 * Handles Discord slash command option autocomplete for round selection
 */
export async function handleRoundAutocomplete(
  interaction: AutocompleteInteraction,
  statusFilter?: RoundStatus
): Promise<void> {
  try {
    const focusedValue = (interaction.options.getFocused() || '').toLowerCase();
    const rounds = await fetchSortedRounds(statusFilter);

    const filtered = rounds.filter((round) => {
      const matchTitle = round.title.toLowerCase().includes(focusedValue);
      const matchStatus = round.status.toLowerCase().includes(focusedValue);
      const matchId = round.id.toLowerCase().includes(focusedValue);
      return matchTitle || matchStatus || matchId;
    });

    const choices = filtered.slice(0, 25).map((round) => {
      const dateStr = round.opensAt || round.createdAt;
      const dateFormatted = dateStr ? new Date(dateStr).toISOString().slice(0, 10) : 'TBA';
      let name = `[${round.status.toUpperCase()}] ${round.title} (${dateFormatted})`;
      if (name.length > 100) {
        name = name.slice(0, 97) + '...';
      }
      return {
        name,
        value: round.id,
      };
    });

    await interaction.respond(choices);
  } catch (error) {
    console.error('Error in handleRoundAutocomplete:', error);
    await interaction.respond([]).catch(() => {});
  }
}

/**
 * Creates an interactive Discord StringSelectMenu component populated with rounds
 */
export function createRoundSelectMenu(
  actionType: string,
  rounds: Round[],
  placeholder: string = 'Select a voting round...'
): ActionRowBuilder<StringSelectMenuBuilder> {
  const sorted = sortRoundsByDate(rounds).slice(0, 25);

  const menu = new StringSelectMenuBuilder()
    .setCustomId(`select_round:${actionType}`)
    .setPlaceholder(placeholder);

  if (sorted.length === 0) {
    menu.addOptions({
      label: 'No rounds available',
      description: 'No active or registered rounds found in the system.',
      value: 'none',
    });
    menu.setDisabled(true);
  } else {
    menu.addOptions(
      sorted.map((round) => {
        const dateStr = round.opensAt || round.createdAt;
        const dateFormatted = dateStr ? new Date(dateStr).toISOString().slice(0, 10) : 'TBA';
        let label = `[${round.status.toUpperCase()}] ${round.title}`;
        if (label.length > 100) label = label.slice(0, 97) + '...';

        let description = `Date: ${dateFormatted} | ID: ${round.id.slice(0, 8)}...`;
        if (round.description) {
          description = `${dateFormatted}: ${round.description}`;
        }
        if (description.length > 100) description = description.slice(0, 97) + '...';

        return {
          label,
          description,
          value: round.id,
        };
      })
    );
  }

  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);
}

/**
 * Handles interactions when a user chooses a round from a StringSelectMenu dropdown
 */
export async function handleRoundSelectMenuInteraction(
  interaction: StringSelectMenuInteraction
): Promise<void> {
  const parts = interaction.customId.split(':');
  const actionType = parts[1];
  const roundId = interaction.values[0];

  if (!roundId || roundId === 'none') {
    await interaction.reply({
      content: 'No valid round selected.',
      ephemeral: true,
    });
    return;
  }

  await interaction.deferReply();

  try {
    switch (actionType) {
      case 'round': {
        const [round, rawEntries] = await Promise.all([
          apiClient.getRound(roundId),
          apiClient.getEntries(roundId).catch(() => [] as Entry[]),
        ]);
        const entries = sortEntriesByDate(rawEntries);
        const embed = createRoundDetailEmbed(round, entries);
        const row = createVoteButtonRow(round.id);
        await interaction.editReply({ embeds: [embed], components: [row] });
        break;
      }

      case 'entries': {
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
        await interaction.editReply({ embeds: [embed], components: [row] });
        break;
      }

      case 'leaderboard': {
        const [round, leaderboardData, rawEntries] = await Promise.all([
          apiClient.getRound(roundId),
          apiClient.getLeaderboard(roundId),
          apiClient.getEntries(roundId).catch(() => [] as Entry[]),
        ]);
        const entriesMap = new Map<string, Entry>();
        for (const entry of rawEntries) {
          entriesMap.set(entry.id, entry);
        }
        const embed = createLeaderboardEmbed(round, leaderboardData, entriesMap);
        const row = createVoteButtonRow(round.id);
        await interaction.editReply({ embeds: [embed], components: [row] });
        break;
      }

      case 'results': {
        const [round, resultsData, rawEntries] = await Promise.all([
          apiClient.getRound(roundId),
          apiClient.getResults(roundId),
          apiClient.getEntries(roundId).catch(() => [] as Entry[]),
        ]);
        const entriesMap = new Map<string, Entry>();
        for (const entry of rawEntries) {
          entriesMap.set(entry.id, entry);
        }
        const embed = createResultsEmbed(round, resultsData, entriesMap);
        await interaction.editReply({ embeds: [embed] });
        break;
      }

      case 'telemetry': {
        if (!isAuthorizedAdmin(interaction.user.id)) {
          await interaction.editReply({
            content: '`[ACCESS DENIED]` You are not authorized to view telemetry data.',
          });
          return;
        }

        const [round, telemetryData, rawEntries] = await Promise.all([
          apiClient.getRound(roundId),
          apiClient.getRoundTelemetry(roundId),
          apiClient.getEntries(roundId).catch(() => [] as Entry[]),
        ]);
        const entriesMap = new Map<string, Entry>();
        for (const entry of rawEntries) {
          entriesMap.set(entry.id, entry);
        }
        let telemetryList: any[] = [];
        if (Array.isArray(telemetryData)) {
          telemetryList = telemetryData;
        } else if (telemetryData && Array.isArray((telemetryData as any).telemetry)) {
          telemetryList = (telemetryData as any).telemetry;
        }
        const embed = createTelemetryEmbed(round, telemetryList, entriesMap);
        await interaction.editReply({ embeds: [embed] });
        break;
      }

      default:
        await interaction.editReply({
          content: `Unknown round action: ${actionType}`,
        });
    }
  } catch (error: any) {
    console.error(`Error handling round select (${actionType}):`, error);
    await interaction.editReply({
      content: `**ERROR:** Failed to load round data: ${error.message || 'API error.'}`,
    });
  }
}
