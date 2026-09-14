import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from '../config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.resolve(__dirname, '../../data/channels.json');

export interface ChannelSettings {
  announcementChannelId?: string;
  telemetryAlertChannelId?: string;
  guildId?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export class ChannelStore {
  private settings: ChannelSettings = {};

  constructor() {
    this.load();
  }

  private load() {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const content = fs.readFileSync(DATA_FILE, 'utf-8');
        this.settings = JSON.parse(content);
      } else {
        this.settings = {
          announcementChannelId: config.defaultAnnouncementChannelId,
          telemetryAlertChannelId: config.defaultTelemetryAlertChannelId,
        };
      }
    } catch (error) {
      console.warn('Could not read channels.json, initializing with default config:', error);
      this.settings = {
        announcementChannelId: config.defaultAnnouncementChannelId,
        telemetryAlertChannelId: config.defaultTelemetryAlertChannelId,
      };
    }
  }

  private save() {
    try {
      const dir = path.dirname(DATA_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(DATA_FILE, JSON.stringify(this.settings, null, 2), 'utf-8');
    } catch (error) {
      console.error('Failed to save channels.json:', error);
    }
  }

  getAnnouncementChannelId(): string | undefined {
    return this.settings.announcementChannelId || config.defaultAnnouncementChannelId;
  }

  getTelemetryAlertChannelId(): string | undefined {
    return this.settings.telemetryAlertChannelId || config.defaultTelemetryAlertChannelId;
  }

  setAnnouncementChannel(channelId: string, updatedBy?: string) {
    this.settings.announcementChannelId = channelId;
    this.settings.updatedAt = new Date().toISOString();
    if (updatedBy) this.settings.updatedBy = updatedBy;
    this.save();
  }

  setTelemetryAlertChannel(channelId: string, updatedBy?: string) {
    this.settings.telemetryAlertChannelId = channelId;
    this.settings.updatedAt = new Date().toISOString();
    if (updatedBy) this.settings.updatedBy = updatedBy;
    this.save();
  }

  getSettings(): ChannelSettings {
    return { ...this.settings };
  }
}

export const channelStore = new ChannelStore();
