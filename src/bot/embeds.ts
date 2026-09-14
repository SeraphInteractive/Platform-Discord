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
  BRAND_PURPLE: 0x8b5cf6,
  EMERALD_GREEN: 0x10b981,
  AMBER_GOLD: 0xf59e0b,
  CRIMSON_RED: 0xef4444,
  DARK_SLATE: 0x1e293b,
  MUTED_GRAY: 0x64748b,
};

export function getStatusEmoji(status: string): string {
  switch (status.toLowerCase()) {
    case 'open':
      return '🟢 **OPEN**';
    case 'closed':
      return '🟡 **CLOSED**';
    case 'finalized':
      return '🟣 **FINALIZED**';
    case 'draft':
      return '⚪ **DRAFT**';
    default:
      return `🔘 **${status.toUpperCase()}**`;
  }
}

export function formatDate(isoString: string | null): string {
  if (!isoString) return 'Not scheduled';
  const date = new Date(isoString);
  const unix = Math.floor(date.getTime() / 1000);
  return `<t:${unix}:F> (<t:${unix}:R>)`;
}

/**
 * Creates the "Vote on Web" button action row
 */
export function createVoteButtonRow(roundId: string): ActionRowBuilder<ButtonBuilder> {
  const voteUrl = `${config.webAppUrl}/studio`;
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setLabel('🗳️ Vote in MCM² Studio')
      .setStyle(ButtonStyle.Link)
      .setURL(voteUrl)
  );
}

/**
 * List all rounds embed
 */
export function createRoundsEmbed(rounds: Round[]): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle('🎬 MCM² Community Voting Rounds')
    .setDescription('Explore all registered community voting rounds for Minecraft Community Movie Squared.')
    .setColor(COLORS.BRAND_PURPLE)
    .setTimestamp();

  if (rounds.length === 0) {
    embed.addFields({
      name: 'No Rounds Found',
      value: 'There are currently no active or upcoming voting rounds.',
    });
    return embed;
  }

  for (const round of rounds) {
    const statusText = getStatusEmoji(round.status);
    const opens = round.opensAt ? `Opens: <t:${Math.floor(new Date(round.opensAt).getTime() / 1000)}:R>` : 'Opens: TBA';
    const closes = round.closesAt ? `Closes: <t:${Math.floor(new Date(round.closesAt).getTime() / 1000)}:R>` : 'Closes: TBA';

    embed.addFields({
      name: `${round.title}`,
      value: `${statusText} · \`ID: ${round.id}\`\n${round.description || 'No description provided.'}\n🗓️ ${opens} | ${closes}`,
      inline: false,
    });
  }

  embed.setFooter({ text: 'Use /round <id> for details or /entries <id> to browse candidates.' });
  return embed;
}

/**
 * Detailed view of a single round
 */
export function createRoundDetailEmbed(round: Round, entries?: Entry[]): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle(`🎬 Round: ${round.title}`)
    .setDescription(round.description || 'No description provided.')
    .setColor(round.status === 'open' ? COLORS.EMERALD_GREEN : round.status === 'finalized' ? COLORS.BRAND_PURPLE : COLORS.MUTED_GRAY)
    .addFields(
      { name: 'Status', value: getStatusEmoji(round.status), inline: true },
      { name: 'Round ID', value: `\`${round.id}\``, inline: true },
      { name: 'Candidates Count', value: entries ? `**${entries.length}** entries` : 'Fetching...', inline: true },
      { name: 'Opens At', value: formatDate(round.opensAt), inline: false },
      { name: 'Closes At', value: formatDate(round.closesAt), inline: false }
    )
    .setTimestamp();

  if (entries && entries.length > 0) {
    const previewList = entries
      .slice(0, 6)
      .map((e, idx) => `**${idx + 1}.** ${e.title} ${e.author ? `*(by ${e.author})*` : ''} ${e.isQuarantined ? '⚠️ [QUARANTINED]' : ''}`)
      .join('\n');

    const suffix = entries.length > 6 ? `\n*...and ${entries.length - 6} more. Use \`/entries ${round.id}\` to browse.*` : '';
    embed.addFields({
      name: 'Candidate Preview',
      value: previewList + suffix,
      inline: false,
    });
  }

  embed.setFooter({ text: 'MCM² Governance & Voting Engine' });
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
    .setTitle(`🎨 Candidate [${currentIndex + 1}/${totalEntries}]: ${entry.title}`)
    .setDescription(entry.description || '*No description provided for this submission.*')
    .setColor(entry.isQuarantined ? COLORS.CRIMSON_RED : COLORS.BRAND_PURPLE)
    .addFields(
      { name: 'Author / Creator', value: entry.author ? `**${entry.author}**` : '*Community Member*', inline: true },
      { name: 'Round', value: `${round.title} (${getStatusEmoji(round.status)})`, inline: true },
      { name: 'Status', value: entry.isQuarantined ? '🚨 **QUARANTINED** *(Suspected Bot Velocity)*' : '✅ Active in Ballot', inline: true },
      { name: 'Entry ID', value: `\`${entry.id}\``, inline: false }
    )
    .setTimestamp();

  if (entry.thumbnailUrl && entry.thumbnailUrl.startsWith('http')) {
    embed.setThumbnail(entry.thumbnailUrl);
  }

  if (entry.mediaUrl && (entry.mediaUrl.endsWith('.png') || entry.mediaUrl.endsWith('.jpg') || entry.mediaUrl.endsWith('.jpeg') || entry.mediaUrl.endsWith('.webp') || entry.mediaUrl.endsWith('.gif'))) {
    embed.setImage(entry.mediaUrl);
  }

  embed.setFooter({ text: `Page ${currentIndex + 1} of ${totalEntries} · Use buttons below to navigate` });
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
      .setLabel('⏮️ First')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(currentIndex === 0),
    new ButtonBuilder()
      .setCustomId(`entry_prev:${roundId}:${currentIndex - 1}`)
      .setLabel('◀️ Previous')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(currentIndex === 0),
    new ButtonBuilder()
      .setCustomId(`entry_next:${roundId}:${currentIndex + 1}`)
      .setLabel('Next ▶️')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(currentIndex >= totalEntries - 1),
    new ButtonBuilder()
      .setCustomId(`entry_last:${roundId}:${totalEntries - 1}`)
      .setLabel('Last ⏭️')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(currentIndex >= totalEntries - 1),
    new ButtonBuilder()
      .setLabel('🗳️ Vote Now')
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
    .setTitle(`📊 Live Leaderboard: ${round.title}`)
    .setDescription(
      `**Total Ballots Cast:** \`${data.totalBallots}\`\n` +
      `**Conservation Check:** ${data.isConserved ? '✅ Conserved (6N verified)' : '⚠️ Warning: Anomaly'}\n` +
      `**Scoring Model:** 3-2-1 Borda with Empirical Bayesian Shrinkage\n` +
      `*Scores are dynamically regularized against candidate exposure.*`
    )
    .setColor(round.status === 'open' ? COLORS.EMERALD_GREEN : COLORS.AMBER_GOLD)
    .setTimestamp();

  if (!data.leaderboard || data.leaderboard.length === 0) {
    embed.addFields({
      name: 'No Ballots Recorded',
      value: 'No valid ballots have been submitted for this round yet.',
    });
    return embed;
  }

  const medals = ['🥇', '🥈', '🥉'];
  const formattedRows = data.leaderboard.slice(0, 10).map((row, index) => {
    const rankPrefix = medals[index] || `**${index + 1}.**`;
    const entry = entriesMap?.get(row.entryId);
    const title = entry ? entry.title : `Entry \`${row.entryId.slice(0, 8)}...\``;
    const author = entry?.author ? ` *(by ${entry.author})*` : '';

    return (
      `${rankPrefix} **${title}**${author}\n` +
      `> 🏆 **Regularized Score:** \`${row.regularizedTotalScore.toFixed(2)}\` | **Raw Points:** \`${row.rawScore}\`\n` +
      `> 🗳️ **Votes:** 🥇 \`${row.rank1Count}\` × 3pt | 🥈 \`${row.rank2Count}\` × 2pt | 🥉 \`${row.rank3Count}\` × 1pt`
    );
  });

  embed.addFields({
    name: 'Current Standings',
    value: formattedRows.join('\n\n'),
    inline: false,
  });

  if (data.leaderboard.length > 10) {
    embed.setFooter({
      text: `Showing top 10 of ${data.leaderboard.length} candidates. Leaderboard cached in Redis (10s TTL).`,
    });
  } else {
    embed.setFooter({ text: 'Leaderboard cached in Redis (10s TTL)' });
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
    .setTitle(`🏆 Finalized Results: ${round.title}`)
    .setDescription(
      `This round is officially finalized and verified by the MCM² governance engine.\n` +
      `**Total Ballots:** \`${result.totalBallots}\` | **Total Points:** \`${result.totalPoints}\`\n` +
      `**Finalized At:** ${formatDate(result.finalizedAt)}`
    )
    .setColor(COLORS.BRAND_PURPLE)
    .setTimestamp();

  if (!result.leaderboard || result.leaderboard.length === 0) {
    embed.addFields({ name: 'No Results', value: 'No results recorded for this round.' });
    return embed;
  }

  const medals = ['🥇 WINNER', '🥈 2ND PLACE', '🥉 3RD PLACE'];
  const topPodium = result.leaderboard.slice(0, 3).map((row, index) => {
    const medal = medals[index] || `#${index + 1}`;
    const entry = entriesMap?.get(row.entryId);
    const title = entry ? entry.title : `Entry \`${row.entryId.slice(0, 8)}...\``;
    const author = entry?.author ? ` by **${entry.author}**` : '';

    return (
      `**${medal}**: **${title}**${author}\n` +
      `Final Regularized Score: \`${row.regularizedTotalScore.toFixed(2)}\` points (Raw: \`${row.rawScore}\` pts)`
    );
  });

  embed.addFields({
    name: '👑 Official Podium',
    value: topPodium.join('\n\n'),
    inline: false,
  });

  // Separation statistical proofs
  if (result.separationResults && result.separationResults.length > 0) {
    const separationProofText = result.separationResults.map((sep, idx) => {
      const entryA = entriesMap?.get(sep.candidateA.entryId)?.title || `Entry #${idx + 1}`;
      const entryB = entriesMap?.get(sep.candidateB.entryId)?.title || `Entry #${idx + 2}`;
      const statusIcon = sep.isStatisticallySeparated ? '✅' : '⚖️';
      const confidence = (sep.confidenceLevel || '95%');

      return (
        `${statusIcon} **${entryA}** vs **${entryB}**:\n` +
        `> Lead Margin: \`+${sep.leadDifference.toFixed(3)}\` pts/ballot | Z-Score: \`${sep.zScore.toFixed(2)}\` (p = \`${sep.pValue.toFixed(4)}\`)\n` +
        `> Result: ${sep.isStatisticallySeparated ? `Statistically Separated (${confidence} Conf.)` : 'Statistical Tie / Within Variance Margin'}`
      );
    });

    embed.addFields({
      name: '📐 Paired Hypothesis Rank Separation Proofs',
      value: separationProofText.join('\n\n'),
      inline: false,
    });
  }

  embed.setFooter({ text: 'Snapshotted permanently into PostgreSQL round_results' });
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
    .setTitle(`🛡️ Raid Telemetry: ${round.title}`)
    .setDescription(
      `Statistical anomaly detection for coordinated voting raids and bot velocity spikes.\n` +
      `\`Z >= 3.0\` triggers automated quarantine and live SSE alert broadcasts.`
    )
    .setColor(COLORS.DARK_SLATE)
    .setTimestamp();

  if (telemetryList.length === 0) {
    embed.addFields({
      name: 'Clean Telemetry',
      value: 'No telemetry records or anomalous activities detected for this round.',
    });
    return embed;
  }

  const rows = telemetryList.map((t) => {
    const entry = entriesMap?.get(t.entryId);
    const title = entry ? entry.title : `Entry \`${t.entryId.slice(0, 8)}...\``;
    const statusIcon = t.isQuarantined ? '🚨 QUARANTINED' : t.isFlagged ? '⚠️ FLAGGED' : '✅ NORMAL';

    return (
      `**${title}** — ${statusIcon}\n` +
      `> Velocity Z-Score: \`${t.velocityZScore.toFixed(2)}\` | Rolling Velocity: \`${t.rollingVelocity.toFixed(2)}\` v/min\n` +
      `> Skew Ratio: \`${(t.skewRatio || 0).toFixed(2)}\` | Entropy: \`${(t.rankEntropy || 0).toFixed(2)}\``
    );
  });

  embed.addFields({
    name: 'Entry Telemetry Matrix',
    value: rows.slice(0, 10).join('\n\n'),
    inline: false,
  });

  embed.setFooter({ text: 'Moderator Telemetry Feed · Powered by @vote-internals/logic' });
  return embed;
}

/**
 * Real-time Raid Alert embed for moderators
 */
export function createRaidAlertEmbed(alert: RaidAlertEvent, round?: Round): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle('🚨 CRITICAL: Coordinated Raid Spike Detected')
    .setDescription(
      `An anomalous voting velocity spike has exceeded statistical thresholds in round **${round?.title || alert.roundId}**.\n` +
      `The target entry has been automatically flagged or quarantined to protect leaderboard integrity.`
    )
    .setColor(COLORS.CRIMSON_RED)
    .addFields(
      { name: 'Target Entry', value: alert.entryTitle ? `**${alert.entryTitle}** (\`${alert.entryId}\`)` : `\`${alert.entryId}\``, inline: true },
      { name: 'Velocity Z-Score', value: `\`${alert.velocityZScore.toFixed(2)}σ\``, inline: true },
      { name: 'Quarantine Action', value: alert.isQuarantined ? '🔒 Automatically Quarantined' : '⚠️ Flagged for Review', inline: true },
      { name: 'Detection Timestamp', value: formatDate(alert.timestamp), inline: false }
    )
    .setFooter({ text: 'AdonisJS 6 Raid Detection Engine' })
    .setTimestamp();
}

/**
 * Public Theatrical Winner Announcement embed
 */
export function createWinnerAnnouncementEmbed(
  round: Round,
  result: RoundResult,
  entriesMap?: Map<string, Entry>
): EmbedBuilder {
  const winnerBreakdown = result.leaderboard[0];
  const winnerEntry = winnerBreakdown ? entriesMap?.get(winnerBreakdown.entryId) : undefined;
  const winnerTitle = winnerEntry ? winnerEntry.title : 'Official Winner';
  const winnerAuthor = winnerEntry?.author ? ` by **${winnerEntry.author}**` : '';

  const embed = new EmbedBuilder()
    .setTitle(`🎉 OFFICIAL WINNER ANNOUNCEMENT: ${round.title}`)
    .setDescription(
      `Community voting has officially concluded for **${round.title}**!\n\n` +
      `🏆 **WINNING ENTRY:**\n` +
      `# 🥇 **${winnerTitle}**${winnerAuthor}\n\n` +
      `**Final Regularized Score:** \`${winnerBreakdown?.regularizedTotalScore.toFixed(2) || 0}\` points\n` +
      `**Total Ballots Cast:** \`${result.totalBallots}\` voters across the community!\n\n` +
      `Thank you to every artist, animator, and creator who submitted entries and cast their ballots. Your contributions directly shape Minecraft Community Movie Squared!`
    )
    .setColor(COLORS.BRAND_PURPLE)
    .setTimestamp();

  if (winnerEntry?.thumbnailUrl && winnerEntry.thumbnailUrl.startsWith('http')) {
    embed.setImage(winnerEntry.thumbnailUrl);
  }

  embed.setFooter({ text: 'MCM² Studio · Official Community Announcement' });
  return embed;
}
