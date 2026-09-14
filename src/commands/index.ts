import * as helpCommand from './help.js';
import * as roundsCommand from './rounds.js';
import * as roundCommand from './round.js';
import * as entriesCommand from './entries.js';
import * as leaderboardCommand from './leaderboard.js';
import * as resultsCommand from './results.js';
import * as telemetryCommand from './telemetry.js';
import * as setChannelCommand from './set-channel.js';
import * as statusCommand from './status.js';

export interface Command {
  data: any;
  execute: (interaction: any) => Promise<void>;
  [key: string]: any;
}

export const commands: Command[] = [
  helpCommand,
  roundsCommand,
  roundCommand,
  entriesCommand,
  leaderboardCommand,
  resultsCommand,
  telemetryCommand,
  setChannelCommand,
  statusCommand,
];

export const commandMap = new Map<string, Command>();
for (const command of commands) {
  commandMap.set(command.data.name, command);
}
