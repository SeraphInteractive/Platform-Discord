import { createBotClient } from './bot/client.js';
import { config } from './config.js';

async function bootstrap() {
  console.log('====================================================');
  console.log('  MCM² READ-ONLY DISCORD BOT & WORKER STARTING UP   ');
  console.log('====================================================');
  console.log(`API Base URL:  ${config.apiBaseUrl}`);
  console.log(`Web App URL:   ${config.webAppUrl}`);
  console.log(`Client ID:     ${config.clientId ? config.clientId : '(missing in .env)'}`);
  console.log(`Guild ID:      ${config.guildId ? config.guildId : '(global command mode)'}`);
  console.log('----------------------------------------------------');

  if (!config.discordToken) {
    console.error('❌ Error: DISCORD_BOT_TOKEN is not defined in .env');
    console.error('Please copy .env.example to .env and fill in your Discord Bot Token.');
    process.exit(1);
  }

  const { client, worker } = createBotClient();

  const handleShutdown = (signal: string) => {
    console.log(`\nReceived ${signal}. Gracefully shutting down...`);
    worker.stop();
    client.destroy();
    process.exit(0);
  };

  process.on('SIGINT', () => handleShutdown('SIGINT'));
  process.on('SIGTERM', () => handleShutdown('SIGTERM'));

  try {
    await client.login(config.discordToken);
  } catch (error: any) {
    console.error('❌ Failed to login to Discord Gateway:', error);
    process.exit(1);
  }
}

bootstrap();
