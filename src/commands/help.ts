import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from 'discord.js';
import { COLORS } from '../bot/embeds.js';

export const data = new SlashCommandBuilder()
  .setName('help')
  .setDescription('List available bot commands');

export async function execute(interaction: ChatInputCommandInteraction) {
  const embed = new EmbedBuilder()
    .setTitle('Bot Commands')
    .setDescription(
      '`/rounds [status]` - View active and closed voting rounds\n' +
      '`/round [round]` - View details and entries for a round\n' +
      '`/entries [round]` - Browse candidate entries with media preview\n' +
      '`/leaderboard [round]` - View current standings and score matrix\n' +
      '`/results [round]` - View finalized results and separation tests\n' +
      '`/docs` - View platform documentation and scoring rules\n' +
      '`/telemetry [round]` - View voting telemetry (Staff)\n' +
      '`/set-announcement-channel` - Configure alert channels (Staff)\n' +
      '`/bot-status` - View bot and API status'
    )
    .setColor(COLORS.DARK_SLATE)
    .setFooter({ text: 'Round arguments provide live autocomplete or an interactive dropdown.' });

  await interaction.reply({ embeds: [embed] });
}
