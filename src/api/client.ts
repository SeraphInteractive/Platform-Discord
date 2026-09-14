import {
  Round,
  RoundStatus,
  Entry,
  LiveLeaderboardResponse,
  RoundResult,
  RoundTelemetrySummary,
  EntryTelemetry,
} from './types.js';
import { config } from '../config.js';

export class VotingApiClient {
  private baseUrl: string;
  private token: string;

  constructor(baseUrl?: string, token?: string) {
    this.baseUrl = (baseUrl || config.apiBaseUrl).replace(/\/+$/, '');
    this.token = token || config.apiBearerToken;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const res = await fetch(url, {
      ...options,
      headers,
    });

    if (!res.ok) {
      let errorMessage = `API Request failed: ${res.status} ${res.statusText}`;
      try {
        const errorBody: any = await res.json();
        if (errorBody && (errorBody.error?.message || errorBody.message)) {
          errorMessage = errorBody.error?.message || errorBody.message;
        }
      } catch {
        // use fallback text
      }
      throw new Error(errorMessage);
    }

    const json: any = await res.json();
    return (json && json.data !== undefined ? json.data : json) as T;
  }

  async getRounds(status?: RoundStatus): Promise<Round[]> {
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    return this.request<Round[]>(`/rounds${query}`);
  }

  async getRound(roundId: string): Promise<Round> {
    return this.request<Round>(`/rounds/${encodeURIComponent(roundId)}`);
  }

  async getEntries(roundId: string): Promise<Entry[]> {
    return this.request<Entry[]>(`/rounds/${encodeURIComponent(roundId)}/entries`);
  }

  async getLeaderboard(roundId: string): Promise<LiveLeaderboardResponse> {
    return this.request<LiveLeaderboardResponse>(`/rounds/${encodeURIComponent(roundId)}/leaderboard`);
  }

  async getResults(roundId: string): Promise<RoundResult> {
    return this.request<RoundResult>(`/rounds/${encodeURIComponent(roundId)}/results`);
  }

  async getRoundTelemetry(roundId: string): Promise<RoundTelemetrySummary | EntryTelemetry[]> {
    return this.request<RoundTelemetrySummary | EntryTelemetry[]>(`/rounds/${encodeURIComponent(roundId)}/telemetry`);
  }

  async getEntryTelemetry(roundId: string, entryId: string): Promise<EntryTelemetry> {
    return this.request<EntryTelemetry>(
      `/rounds/${encodeURIComponent(roundId)}/telemetry/${encodeURIComponent(entryId)}`
    );
  }

  /**
   * Connect to the SSE event stream for live round events (raid alerts, ballot submissions)
   */
  subscribeToRoundEvents(
    roundId: string,
    onEvent: (event: string, payload: any) => void,
    onError?: (error: Error) => void
  ): () => void {
    const url = `${this.baseUrl}/rounds/${encodeURIComponent(roundId)}/events`;
    const controller = new AbortController();
    let isClosed = false;

    (async () => {
      try {
        const headers: Record<string, string> = {
          Accept: 'text/event-stream',
        };
        if (this.token) {
          headers['Authorization'] = `Bearer ${this.token}`;
        }

        const response = await fetch(url, {
          headers,
          signal: controller.signal,
        });

        if (!response.ok || !response.body) {
          throw new Error(`SSE stream connection failed with status ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';

        while (!isClosed) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          let currentEvent = 'message';
          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('event:')) {
              currentEvent = trimmed.substring(6).trim();
            } else if (trimmed.startsWith('data:')) {
              const dataStr = trimmed.substring(5).trim();
              try {
                const parsed = JSON.parse(dataStr);
                onEvent(currentEvent, parsed);
              } catch {
                onEvent(currentEvent, dataStr);
              }
            }
          }
        }
      } catch (err: any) {
        if (!isClosed && err.name !== 'AbortError') {
          if (onError) onError(err);
        }
      }
    })();

    return () => {
      isClosed = true;
      controller.abort();
    };
  }
}

export const apiClient = new VotingApiClient();
