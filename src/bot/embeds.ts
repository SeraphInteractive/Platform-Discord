import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import {
  Round,
  Entry,
  LiveLeaderboardResponse,
  RoundResult,
  EntryTelemetry,
  RaidAlertEvent,
} from '../api/types.js';
import { config } from '../config.js';

export const COLORS = {
  DARK_SLATE: 0x1e293b,
  BRAND_BLUE: 0x2563eb,
  SUCCESS_GREEN: 0x10b981,
  WARNING_AMBER: 0xf59e0b,
  CRIMSON_RED: 0xef4444,
  MUTED_GRAY: 0x64748b,
};

export function getStatusBadge(status: string): string {
  return `\`[${status.toUpperCase()}]\``;
}

export function formatDate(isoString: string | null): string {
  if (!isoString) return 'Not scheduled';
  const date = new Date(isoString);
  const unix = Math.floor(date.getTime() / 1000);
  return `<t:${unix}:F> (<t:${unix}:R>)`;
}

/**
 * Creates the "Open Web App" link button row
 */
export function createVoteButtonRow(roundId: string): ActionRowBuilder<ButtonBuilder> {
  const voteUrl = `${config.webAppUrl}/studio`;
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setLabel('Open Web App')
      .setStyle(ButtonStyle.Link)
      .setURL(voteUrl)
  );
}

/**
 * List all rounds embed
 */
export function createRoundsEmbed(rounds: Round[]): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle('Voting Rounds')
    .setDescription('Registered community rounds.')
    .setColor(COLORS.DARK_SLATE)
    .setTimestamp();

  if (rounds.length === 0) {
    embed.addFields({
      name: 'Status',
      value: 'No voting rounds found.',
    });
    return embed;
  }

  for (const round of rounds) {
    const statusBadge = getStatusBadge(round.status);
    const opens = round.opensAt ? `Opens: <t:${Math.floor(new Date(round.opensAt).getTime() / 1000)}:R>` : 'Opens: TBA';
    const closes = round.closesAt ? `Closes: <t:${Math.floor(new Date(round.closesAt).getTime() / 1000)}:R>` : 'Closes: TBA';

    embed.addFields({
      name: `${round.title}`,
      value: `${statusBadge} | ID: \`${round.id}\`\n${round.description || 'No description.'}\n${opens} | ${closes}`,
      inline: false,
    });
  }

  embed.setFooter({ text: 'Use /round, /entries, or /leaderboard to view round details.' });
  return embed;
}

/**
 * Detailed view of a single round
 */
export function createRoundDetailEmbed(round: Round, entries?: Entry[]): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle(`Round: ${round.title}`)
    .setDescription(round.description || 'No description provided.')
    .setColor(round.status === 'open' ? COLORS.SUCCESS_GREEN : round.status === 'finalized' ? COLORS.BRAND_BLUE : COLORS.MUTED_GRAY)
    .addFields(
      { name: 'Status', value: getStatusBadge(round.status), inline: true },
      { name: 'Round ID', value: `\`${round.id}\``, inline: true },
      { name: 'Entries', value: entries ? `\`${entries.length}\`` : '`Loading...`', inline: true },
      { name: 'Opens At', value: formatDate(round.opensAt), inline: false },
      { name: 'Closes At', value: formatDate(round.closesAt), inline: false }
    )
    .setTimestamp();

  if (entries && entries.length > 0) {
    const previewList = entries
      .slice(0, 6)
      .map((e, idx) => `${idx + 1}. **${e.title}** ${e.author ? `(${e.author})` : ''} ${e.isQuarantined ? '`[QUARANTINED]`' : ''}`)
      .join('\n');

    const suffix = entries.length > 6 ? `\n*...and ${entries.length - 6} more.*` : '';
    embed.addFields({
      name: 'Submitted Entries (Sorted by Date)',
      value: previewList + suffix,
      inline: false,
    });
  }

  embed.setFooter({ text: 'Platform Voting System' });
  return embed;
}

/**
 * Single candidate entry card for interactive browsing
 */
export function createSingleEntryEmbed(
  round: Round,
  entry: Entry,
  currentIndex: number,
  totalEntries: number
): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle(`Entry [${currentIndex + 1}/${totalEntries}]: ${entry.title}`)
    .setDescription(entry.description || 'No description provided.')
    .setColor(entry.isQuarantined ? COLORS.CRIMSON_RED : COLORS.DARK_SLATE)
    .addFields(
      { name: 'Author', value: entry.author ? `\`${entry.author}\`` : '`Unknown`', inline: true },
      { name: 'Round', value: `${round.title} (${getStatusBadge(round.status)})`, inline: true },
      { name: 'Status', value: entry.isQuarantined ? '`[QUARANTINED]`' : '`[ACTIVE]`', inline: true },
      { name: 'Submitted', value: formatDate(entry.createdAt || null), inline: true },
      { name: 'Entry ID', value: `\`${entry.id}\``, inline: true }
    )
    .setTimestamp();

  if (entry.thumbnailUrl && entry.thumbnailUrl.startsWith('http')) {
    embed.setThumbnail(entry.thumbnailUrl);
  }

  if (entry.mediaUrl && (entry.mediaUrl.endsWith('.png') || entry.mediaUrl.endsWith('.jpg') || entry.mediaUrl.endsWith('.jpeg') || entry.mediaUrl.endsWith('.webp') || entry.mediaUrl.endsWith('.gif'))) {
    embed.setImage(entry.mediaUrl);
  }

  embed.setFooter({ text: `Entry ${currentIndex + 1} of ${totalEntries} | Sorted by submission date` });
  return embed;
}

/**
 * Creates navigation button row for interactive candidate browsing
 */
export function createEntryPaginationRow(
  currentIndex: number,
  totalEntries: number,
  roundId: string
): ActionRowBuilder<ButtonBuilder> {
  const row = new ActionRowBuilder<ButtonBuilder>();

  row.addComponents(
    new ButtonBuilder()
      .setCustomId(`entry_first:${roundId}`)
      .setLabel('First')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(currentIndex === 0),
    new ButtonBuilder()
      .setCustomId(`entry_prev:${roundId}:${currentIndex - 1}`)
      .setLabel('Prev')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(currentIndex === 0),
    new ButtonBuilder()
      .setCustomId(`entry_next:${roundId}:${currentIndex + 1}`)
      .setLabel('Next')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(currentIndex >= totalEntries - 1),
    new ButtonBuilder()
      .setCustomId(`entry_last:${roundId}:${totalEntries - 1}`)
      .setLabel('Last')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(currentIndex >= totalEntries - 1),
    new ButtonBuilder()
      .setLabel('Open Web App')
      .setStyle(ButtonStyle.Link)
      .setURL(`${config.webAppUrl}/studio`)
  );

  return row;
}

/**
 * Live leaderboard embed
 */
export function createLeaderboardEmbed(
  round: Round,
  data: LiveLeaderboardResponse,
  entriesMap?: Map<string, Entry>
): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle(`Leaderboard: ${round.title}`)
    .setDescription(
      `Total Ballots: \`${data.totalBallots}\`\n` +
      `Point Conservation: \`${data.isConserved ? 'Valid (6N)' : 'Anomaly'}\``
    )
    .setColor(round.status === 'open' ? COLORS.SUCCESS_GREEN : COLORS.WARNING_AMBER)
    .setTimestamp();

  if (!data.leaderboard || data.leaderboard.length === 0) {
    embed.addFields({
      name: 'Standings',
      value: 'No ballots recorded yet.',
    });
    return embed;
  }

  const formattedRows = data.leaderboard.slice(0, 10).map((row, index) => {
    const entry = entriesMap?.get(row.entryId);
    const title = entry ? entry.title : `Entry ${row.entryId.slice(0, 8)}...`;
    const author = entry?.author ? ` (${entry.author})` : '';

    return (
      `**${index + 1}. ${title}**${author}\n` +
      `Score: \`${row.regularizedTotalScore.toFixed(2)}\` pts (Raw: \`${row.rawScore}\`) | Ranks: 1st: \`${row.rank1Count}\`, 2nd: \`${row.rank2Count}\`, 3rd: \`${row.rank3Count}\``
    );
  });

  embed.addFields({
    name: 'Current Standings',
    value: formattedRows.join('\n\n'),
    inline: false,
  });

  if (data.leaderboard.length > 10) {
    embed.setFooter({
      text: `Top 10 of ${data.leaderboard.length} entries | Cached (10s TTL)`,
    });
  } else {
    embed.setFooter({ text: 'Cached (10s TTL)' });
  }

  return embed;
}

/**
 * Finalized results embed with statistical separation proofs
 */
export function createResultsEmbed(
  round: Round,
  result: RoundResult,
  entriesMap?: Map<string, Entry>
): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle(`Final Results: ${round.title}`)
    .setDescription(
      `Total Ballots: \`${result.totalBallots}\` | Total Points: \`${result.totalPoints}\`\n` +
      `Finalized: ${formatDate(result.finalizedAt)}`
    )
    .setColor(COLORS.BRAND_BLUE)
    .setTimestamp();

  if (!result.leaderboard || result.leaderboard.length === 0) {
    embed.addFields({ name: 'Results', value: 'No results recorded.' });
    return embed;
  }

  const topPodium = result.leaderboard.slice(0, 5).map((row, index) => {
    const entry = entriesMap?.get(row.entryId);
    const title = entry ? entry.title : `Entry ${row.entryId.slice(0, 8)}...`;
    const author = entry?.author ? ` (${entry.author})` : '';

    return (
      `**${index + 1}. ${title}**${author}\n` +
      `Score: \`${row.regularizedTotalScore.toFixed(2)}\` pts (Raw: \`${row.rawScore}\`)`
    );
  });

  embed.addFields({
    name: 'Top Standings',
    value: topPodium.join('\n\n'),
    inline: false,
  });

  if (result.separationResults && result.separationResults.length > 0) {
    const separationProofText = result.separationResults.map((sep, idx) => {
      const entryA = entriesMap?.get(sep.candidateA.entryId)?.title || `Entry #${idx + 1}`;
      const entryB = entriesMap?.get(sep.candidateB.entryId)?.title || `Entry #${idx + 2}`;
      const statusLabel = sep.isStatisticallySeparated ? '[Separated]' : '[Tie]';

      return (
        `\`${statusLabel}\` **${entryA}** vs **${entryB}**\n` +
        `Margin: \`+${sep.leadDifference.toFixed(3)}\` pts/ballot | Z-Score: \`${sep.zScore.toFixed(2)}\` (p=${sep.pValue.toFixed(4)})`
      );
    });

    embed.addFields({
      name: 'Rank Separation Tests',
      value: separationProofText.join('\n\n'),
      inline: false,
    });
  }

  embed.setFooter({ text: 'Round finalized' });
  return embed;
}

/**
 * Moderator Telemetry & Anomaly Analysis Embed
 */
export function createTelemetryEmbed(
  round: Round,
  telemetryList: EntryTelemetry[],
  entriesMap?: Map<string, Entry>
): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle(`Telemetry: ${round.title}`)
    .setDescription('Vote velocity and distribution statistics.')
    .setColor(COLORS.DARK_SLATE)
    .setTimestamp();

  if (telemetryList.length === 0) {
    embed.addFields({
      name: 'Status',
      value: 'All entries within expected parameters.',
    });
    return embed;
  }

  const rows = telemetryList.map((t) => {
    const entry = entriesMap?.get(t.entryId);
    const title = entry ? entry.title : `Entry ${t.entryId.slice(0, 8)}...`;
    const statusLabel = t.isQuarantined ? '[QUARANTINED]' : t.isFlagged ? '[FLAGGED]' : '[NORMAL]';

    return (
      `\`${statusLabel}\` **${title}**\n` +
      `Velocity Z-Score: \`${t.velocityZScore.toFixed(2)}\` | Rate: \`${t.rollingVelocity.toFixed(2)}\` v/min | Skew: \`${(t.skewRatio || 0).toFixed(2)}\``
    );
  });

  embed.addFields({
    name: 'Entries Telemetry',
    value: rows.slice(0, 10).join('\n\n'),
    inline: false,
  });

  embed.setFooter({ text: 'Platform Telemetry' });
  return embed;
}

/**
 * Real-time Raid Alert embed for moderators
 */
export function createRaidAlertEmbed(alert: RaidAlertEvent, round?: Round): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle('Security Alert: High Voting Velocity')
    .setDescription(
      `Velocity threshold exceeded in round: **${round?.title || alert.roundId}**`
    )
    .setColor(COLORS.CRIMSON_RED)
    .addFields(
      { name: 'Target Entry', value: alert.entryTitle ? `**${alert.entryTitle}** (\`${alert.entryId}\`)` : `\`${alert.entryId}\``, inline: true },
      { name: 'Velocity Z-Score', value: `\`${alert.velocityZScore.toFixed(2)}\``, inline: true },
      { name: 'Action', value: alert.isQuarantined ? '`[QUARANTINED]`' : '`[FLAGGED]`', inline: true },
      { name: 'Timestamp', value: formatDate(alert.timestamp), inline: false }
    )
    .setFooter({ text: 'Automated Alert' })
    .setTimestamp();
}

/**
 * Public Winner Announcement embed
 */
export function createWinnerAnnouncementEmbed(
  round: Round,
  result: RoundResult,
  entriesMap?: Map<string, Entry>
): EmbedBuilder {
  const winnerBreakdown = result.leaderboard[0];
  const winnerEntry = winnerBreakdown ? entriesMap?.get(winnerBreakdown.entryId) : undefined;
  const winnerTitle = winnerEntry ? winnerEntry.title : 'Winner';
  const winnerAuthor = winnerEntry?.author ? ` (${winnerEntry.author})` : '';

  const embed = new EmbedBuilder()
    .setTitle(`Round Finalized: ${round.title}`)
    .setDescription(
      `Voting has concluded.\n\n` +
      `**1st Place:** **${winnerTitle}**${winnerAuthor}\n` +
      `**Score:** \`${winnerBreakdown?.regularizedTotalScore.toFixed(2) || 0}\` pts\n` +
      `**Total Ballots:** \`${result.totalBallots}\``
    )
    .setColor(COLORS.BRAND_BLUE)
    .setTimestamp();

  if (winnerEntry?.thumbnailUrl && winnerEntry.thumbnailUrl.startsWith('http')) {
    embed.setImage(winnerEntry.thumbnailUrl);
  }

  embed.setFooter({ text: 'Platform Announcements' });
  return embed;
}
