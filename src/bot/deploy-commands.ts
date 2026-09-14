import { REST, Routes } from 'discord.js';
import { commands } from '../commands/index.js';
import { config } from '../config.js';

const commandData = commands.map((cmd) => cmd.data.toJSON());

if (!config.discordToken) {
  console.error('❌ DISCORD_BOT_TOKEN is missing in environment variables.');
  console.error('Please configure .env before deploying slash commands.');
  process.exit(1);
}

if (!config.clientId) {
  console.error('❌ DISCORD_CLIENT_ID is missing in environment variables.');
  console.error('Please configure .env before deploying slash commands.');
  process.exit(1);
}

const rest = new REST({ version: '10' }).setToken(config.discordToken);

async function deploy() {
  try {
    console.log(`🚀 Deploying ${commandData.length} slash commands...`);

    if (config.guildId) {
      // Guild specific registration (instant update for testing / specific server)
      console.log(`Registering commands to Guild ID: ${config.guildId}`);
      const data: any = await rest.put(
        Routes.applicationGuildCommands(config.clientId, config.guildId),
        { body: commandData }
      );
      console.log(`✅ Successfully deployed ${data.length} guild slash commands.`);
    } else {
      // Global registration
      console.log('Registering global application commands (may take a few minutes to propagate across all servers)...');
      const data: any = await rest.put(
        Routes.applicationCommands(config.clientId),
        { body: commandData }
      );
      console.log(`✅ Successfully deployed ${data.length} global slash commands.`);
    }
  } catch (error) {
    console.error('❌ Error deploying slash commands:', error);
    process.exit(1);
  }
}

deploy();
