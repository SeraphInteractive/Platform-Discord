export type RoundStatus = 'draft' | 'open' | 'closed' | 'finalized';

export interface Round {
  id: string;
  title: string;
  description: string;
  status: RoundStatus;
  opensAt: string | null;
  closesAt: string | null;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Entry {
  id: string;
  roundId: string;
  title: string;
  description?: string;
  author?: string;
  thumbnailUrl?: string;
  mediaUrl?: string;
  isQuarantined?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface LeaderboardBreakdown {
  entryId: string;
  rank1Count: number;
  rank2Count: number;
  rank3Count: number;
  rawScore: number;
  bordaMeanScore: number;
  regularizedMeanScore: number;
  regularizedTotalScore: number;
}

export interface LiveLeaderboardResponse {
  leaderboard: LeaderboardBreakdown[];
  totalBallots: number;
  isConserved: boolean;
}

export interface SeparationResult {
  candidateA: {
    entryId: string;
    meanScore: number;
  };
  candidateB: {
    entryId: string;
    meanScore: number;
  };
  leadDifference: number;
  pairedVariance: number;
  zScore: number;
  pValue: number;
  isStatisticallySeparated: boolean;
  confidenceLevel: string;
}

export interface RoundResult {
  id: string;
  roundId: string;
  totalBallots: number;
  totalPoints: number;
  isConserved: boolean;
  leaderboard: LeaderboardBreakdown[];
  separationResults: SeparationResult[];
  finalizedAt: string;
  finalizedBy: string;
}

export interface EntryTelemetry {
  entryId: string;
  roundId: string;
  rollingVelocity: number;
  meanVelocity: number;
  stdDevVelocity: number;
  velocityZScore: number;
  skewRatio: number;
  rankEntropy: number;
  isFlagged: boolean;
  isQuarantined: boolean;
  calculatedAt?: string;
}

export interface RoundTelemetrySummary {
  roundId: string;
  activeEntries: number;
  flaggedCount: number;
  quarantinedCount: number;
  telemetry: EntryTelemetry[];
}

export interface RaidAlertEvent {
  roundId: string;
  entryId: string;
  entryTitle?: string;
  velocityZScore: number;
  isQuarantined: boolean;
  timestamp: string;
  message?: string;
}

export interface BallotSubmittedEvent {
  roundId: string;
  ballotId: string;
  timestamp: string;
}
