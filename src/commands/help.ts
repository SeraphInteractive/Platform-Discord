import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { COLORS } from '../bot/embeds.js';
import { config } from '../config.js';

export const data = new SlashCommandBuilder()
  .setName('help')
  .setDescription('Learn how community voting, 3-2-1 Borda scoring, and bot commands work');

export async function execute(interaction: ChatInputCommandInteraction) {
  const embed = new EmbedBuilder()
    .setTitle('📖 Community Voting & Platform Guide')
    .setDescription(
      `Welcome to the **Creative Community Voting Platform**!\n` +
      `This bot provides real-time standings, statistical telemetry, and automated alert broadcasts directly from the production pipeline.\n\n` +
      `🔒 **Voting Security:** All ballots must be cast securely via the web application using verified Discord authentication. Voting is not performed inside chat.`
    )
    .setColor(COLORS.BRAND_PURPLE)
    .addFields(
      {
        name: '🗳️ 3-2-1 Ranked Borda Scoring System',
        value:
          '• Each verified voter selects their top 3 favorite candidate proposals:\n' +
          '  - **Rank 1 (Gold):** **3 Points**\n' +
          '  - **Rank 2 (Silver):** **2 Points**\n' +
          '  - **Rank 3 (Bronze):** **1 Point**\n' +
          '• **Point Conservation ($6N$):** Every valid ballot precisely injects 6 points into the universe across 3 distinct entries.\n' +
          '• **Anti-Stacking:** A voter cannot allocate multiple ranks to the same proposal.',
      },
      {
        name: '📐 Empirical Bayesian Shrinkage',
        value:
          'To prevent low-exposure entries or early-vote anomalies from distorting the leaderboard, final standings are regularized toward the community prior ($3.0$ expected points) weighted by sample size and variance.',
      },
      {
        name: '🛡️ Anti-Raid & Anomaly Telemetry',
        value:
          'Every round is continuously monitored for coordinated ballot spikes, extreme rank skew ratios, and rank entropy anomalies to guarantee 100% fair community consensus.',
      },
      {
        name: '🤖 Available Slash Commands',
        value:
          '• `/help` - Overview of voting system, mechanics, and available commands\n' +
          '• `/rounds` - Browse active, closed, and finalized voting rounds\n' +
          '• `/round <round_id>` - View round details, submission counts, and time windows\n' +
          '• `/entries <round_id>` - Explore candidate creative proposals with media previews\n' +
          '• `/leaderboard <round_id>` - View live 3-2-1 Borda score matrix and rankings\n' +
          '• `/results <round_id>` - Detailed regularized results and Bayesian score breakdown\n' +
          '• `/telemetry <round_id>` - Statistical metrics (Raid Risk, Entropy, Variance)\n' +
          '• `/set-channel` - *(Staff)* Route announcement and telemetry alert streams\n' +
          '• `/bot-status` - *(Staff)* Check gateway ping, API target, and worker latency',
      }
    )
    .setFooter({
      text: 'Platform Production Pipeline • Consensus Engine',
    })
    .setTimestamp();

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setLabel('🗳️ Open Web Voting Platform')
      .setStyle(ButtonStyle.Link)
      .setURL(config.webAppUrl || 'http://localhost:5173')
  );

  await interaction.reply({ embeds: [embed], components: [row] });
}
