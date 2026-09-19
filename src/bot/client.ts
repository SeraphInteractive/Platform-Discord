import {
  Client,
  GatewayIntentBits,
  Interaction,
  Events,
  ActivityType,
} from 'discord.js';
import { commandMap } from '../commands/index.js';
import { handleEntryPagination } from '../commands/entries.js';
import { handleRoundSelectMenuInteraction, handleRoundAutocomplete } from './round-selector.js';
import { apiClient } from '../api/client.js';
import { BackgroundEventWorker } from '../workers/sse-worker.js';

import { config } from '../config.js';

export function createBotClient(): { client: Client; worker: BackgroundEventWorker } {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.GuildMembers,
    ],
  });

  const worker = new BackgroundEventWorker(client);

  client.once(Events.ClientReady, (readyClient) => {
    console.log(`Bot initialized as ${readyClient.user.tag} (${readyClient.user.id})`);

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

  // Auto-grant Observer role when a user joins the server
  client.on(Events.GuildMemberAdd, async (member) => {
    const observerRoleId = config.observerRoleId;
    if (!observerRoleId) return;

    try {
      await member.roles.add(observerRoleId);
      console.log(`[Bot] Auto-granted Observer role (${observerRoleId}) to new member: ${member.user.tag} (${member.id})`);
    } catch (err: any) {
      console.error(`[Bot] Failed to auto-grant Observer role to ${member.user.tag}:`, err?.message || err);
    }
  });

  client.on(Events.InteractionCreate, async (interaction: Interaction) => {
    // 1. Handle Autocomplete Interactions
    if (interaction.isAutocomplete()) {
      const command = commandMap.get(interaction.commandName);
      try {
        if (command && typeof command.autocomplete === 'function') {
          await command.autocomplete(interaction);
        } else {
          await handleRoundAutocomplete(interaction);
        }
      } catch (error) {
        console.error(`Error during autocomplete for /${interaction.commandName}:`, error);
        await interaction.respond([]).catch(() => {});
      }
      return;
    }

    // 2. Handle String Select Menu (Dropdown) Interactions
    if (interaction.isStringSelectMenu()) {
      if (interaction.customId.startsWith('select_round:')) {
        try {
          await handleRoundSelectMenuInteraction(interaction);
        } catch (error) {
          console.error('Error handling round select dropdown:', error);
          const errorPayload = {
            content: '**ERROR:** An unexpected error occurred while processing selection.',
            ephemeral: true,
          };
          if (interaction.replied || interaction.deferred) {
            await interaction.followUp(errorPayload).catch(() => {});
          } else {
            await interaction.reply(errorPayload).catch(() => {});
          }
        }
        return;
      }
    }

    // 3. Handle Slash Commands
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
          content: '**ERROR:** An error occurred while executing this command.',
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

    // 4. Handle Button Interactions (e.g. entry pagination)
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
              content: '**ERROR:** Failed to load entry page. The round or candidate data may have changed.',
              ephemeral: true,
            }).catch(() => {});
          }
        }
      }
    }
  });

  return { client, worker };
}
