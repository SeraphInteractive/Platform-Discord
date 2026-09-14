import {
  Client,
  GatewayIntentBits,
  Interaction,
  Events,
  ActivityType,
} from 'discord.js';
import { commandMap } from '../commands/index.js';
import { handleEntryPagination } from '../commands/entries.js';
import { apiClient } from '../api/client.js';
import { BackgroundEventWorker } from '../workers/sse-worker.js';

export function createBotClient(): { client: Client; worker: BackgroundEventWorker } {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
    ],
  });

  const worker = new BackgroundEventWorker(client);

  client.once(Events.ClientReady, (readyClient) => {
    console.log(`🤖 Logged in as ${readyClient.user.tag} (${readyClient.user.id})`);
    
    readyClient.user.setPresence({
      activities: [
        {
          name: 'Voting Rounds | /rounds',
          type: ActivityType.Watching,
        },
      ],
      status: 'online',
    });

    // Start background event worker
    worker.start();
  });

  client.on(Events.InteractionCreate, async (interaction: Interaction) => {
    // 1. Handle Slash Commands
    if (interaction.isChatInputCommand()) {
      const command = commandMap.get(interaction.commandName);
      if (!command) {
        console.warn(`No command matching ${interaction.commandName} was found.`);
        return;
      }

      try {
        await command.execute(interaction);
      } catch (error: any) {
        console.error(`Error executing /${interaction.commandName}:`, error);
        const errorMessage = {
          content: '⚠️ An error occurred while executing this command.',
          ephemeral: true,
        };

        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(errorMessage).catch(() => {});
        } else {
          await interaction.reply(errorMessage).catch(() => {});
        }
      }
      return;
    }

    // 2. Handle Button Interactions (e.g. entry pagination)
    if (interaction.isButton()) {
      const customId = interaction.customId;
      if (customId.startsWith('entry_')) {
        const parts = customId.split(':');
        const roundId = parts[1];
        if (roundId) {
          try {
            const [round, entries] = await Promise.all([
              apiClient.getRound(roundId),
              apiClient.getEntries(roundId),
            ]);
            await handleEntryPagination(interaction, round, entries);
          } catch (err: any) {
            console.error('Error handling entry pagination button:', err);
            await interaction.reply({
              content: '❌ Failed to load entry page. The round or candidate data may have changed.',
              ephemeral: true,
            }).catch(() => {});
          }
        }
      }
    }
  });

  return { client, worker };
}
