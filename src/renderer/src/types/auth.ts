export interface TrackerAccountSummary {
  connected: boolean;
  username?: string;
  updatedAt?: string | null;
}

export type AuthAccountsState = Record<string, TrackerAccountSummary>;
