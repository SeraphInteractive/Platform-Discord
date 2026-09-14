import { Client, TextChannel } from 'discord.js';
import { apiClient } from '../api/client.js';
import { config } from '../config.js';
import { channelStore } from '../storage/channel-store.js';
import { createRaidAlertEmbed, createWinnerAnnouncementEmbed } from '../bot/embeds.js';
import { Entry, RaidAlertEvent, Round, RoundStatus } from '../api/types.js';

export class BackgroundEventWorker {
  private client: Client;
  private activeStreams: Map<string, () => void> = new Map();
  private knownRoundStatuses: Map<string, RoundStatus> = new Map();
  private announcedFinalizedRounds: Set<string> = new Set();
  private isRunning: boolean = false;
  private pollIntervalTimer: NodeJS.Timeout | null = null;

  constructor(client: Client) {
    this.client = client;
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log('📡 Starting Background SSE and Announcement Worker...');

    // Initial check
    this.pollRoundsAndSyncStreams();

    // Periodic poll
    this.pollIntervalTimer = setInterval(() => {
      this.pollRoundsAndSyncStreams();
    }, config.ssePollIntervalMs);
  }

  stop() {
    this.isRunning = false;
    if (this.pollIntervalTimer) {
      clearInterval(this.pollIntervalTimer);
      this.pollIntervalTimer = null;
    }

    // Close all active SSE streams
    for (const [roundId, unsubscribe] of this.activeStreams.entries()) {
      try {
        unsubscribe();
      } catch (err) {
        console.error(`Error unsubscribing SSE stream for round ${roundId}:`, err);
      }
    }
    this.activeStreams.clear();
    console.log('🛑 Background Worker stopped.');
  }

  private async pollRoundsAndSyncStreams() {
    try {
      const rounds = await apiClient.getRounds();
      const openRoundIds = new Set<string>();

      for (const round of rounds) {
        const prevStatus = this.knownRoundStatuses.get(round.id);
        this.knownRoundStatuses.set(round.id, round.status);

        if (round.status === 'open') {
          openRoundIds.add(round.id);
          if (!this.activeStreams.has(round.id)) {
            this.subscribeToRound(round);
          }
        }

        // Detect round finalization transition
        if (round.status === 'finalized') {
          if (prevStatus && prevStatus !== 'finalized' && !this.announcedFinalizedRounds.has(round.id)) {
            this.handleRoundFinalized(round);
          }
        }
      }

      // Cleanup closed streams
      for (const [roundId, unsubscribe] of this.activeStreams.entries()) {
        if (!openRoundIds.has(roundId)) {
          console.log(`[Worker] Closing SSE stream for round ${roundId} (status is no longer open).`);
          unsubscribe();
          this.activeStreams.delete(roundId);
        }
      }
    } catch (error: any) {
      console.warn(`[Worker] Failed to poll rounds from API: ${error.message}`);
    }
  }

  private subscribeToRound(round: Round) {
    console.log(`[Worker] Subscribing to SSE stream for round: ${round.title} (${round.id})`);

    const unsubscribe = apiClient.subscribeToRoundEvents(
      round.id,
      (eventType, payload) => {
        this.handleEvent(round, eventType, payload);
      },
      (error) => {
        console.warn(`[Worker] SSE stream error on round ${round.id}: ${error.message}`);
        this.activeStreams.delete(round.id);
      }
    );

    this.activeStreams.set(round.id, unsubscribe);
  }

  private async handleEvent(round: Round, eventType: string, payload: any) {
    console.log(`[Worker] Received SSE event [${eventType}] on round ${round.id}`);

    if (eventType === 'raid:alert') {
      await this.dispatchRaidAlert(round, payload as RaidAlertEvent);
    } else if (eventType === 'round:finalized') {
      await this.handleRoundFinalized(round);
    }
  }

  private async dispatchRaidAlert(round: Round, alert: RaidAlertEvent) {
    const alertChannelId = channelStore.getTelemetryAlertChannelId();
    if (!alertChannelId) {
      console.log('[Worker] No telemetry alert channel configured, skipping raid alert broadcast.');
      return;
    }

    try {
      const channel = await this.client.channels.fetch(alertChannelId);
      if (channel && channel.isTextBased()) {
        const embed = createRaidAlertEmbed(alert, round);
        await (channel as TextChannel).send({ embeds: [embed] });
        console.log(`[Worker] Dispatched raid alert to channel ${alertChannelId}`);
      }
    } catch (err: any) {
      console.error(`[Worker] Failed to dispatch raid alert message: ${err.message}`);
    }
  }

  async handleRoundFinalized(round: Round) {
    if (this.announcedFinalizedRounds.has(round.id)) return;
    this.announcedFinalizedRounds.add(round.id);

    console.log(`[Worker] Processing official winner announcement for round: ${round.title} (${round.id})`);

    const announcementChannelId = channelStore.getAnnouncementChannelId();
    if (!announcementChannelId) {
      console.log('[Worker] No winner announcement channel configured, skipping public announcement broadcast.');
      return;
    }

    try {
      const [results, entries] = await Promise.all([
        apiClient.getResults(round.id),
        apiClient.getEntries(round.id).catch(() => [] as Entry[]),
      ]);

      const entriesMap = new Map<string, Entry>();
      for (const entry of entries) {
        entriesMap.set(entry.id, entry);
      }

      const channel = await this.client.channels.fetch(announcementChannelId);
      if (channel && channel.isTextBased()) {
        const embed = createWinnerAnnouncementEmbed(round, results, entriesMap);
        await (channel as TextChannel).send({ embeds: [embed] });
        console.log(`[Worker] Successfully posted official winner announcement to channel ${announcementChannelId}!`);
      }
    } catch (err: any) {
      console.error(`[Worker] Failed to dispatch winner announcement: ${err.message}`);
    }
  }
}
