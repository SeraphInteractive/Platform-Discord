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
  .setName('docs')
  .setDescription('View platform documentation and scoring mechanics');

export async function execute(interaction: ChatInputCommandInteraction) {
  const embed = new EmbedBuilder()
    .setTitle('Documentation & Scoring')
    .setDescription(
      'Ballots use 3-2-1 ranked choice scoring (1st: 3pts, 2nd: 2pts, 3rd: 1pt) with Empirical Bayesian shrinkage.'
    )
    .setColor(COLORS.DARK_SLATE);

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setLabel('View Full Documentation')
      .setStyle(ButtonStyle.Link)
      .setURL(`${config.webAppUrl}/docs`)
  );

  await interaction.reply({ embeds: [embed], components: [row] });
}
