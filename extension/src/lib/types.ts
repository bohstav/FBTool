export enum AccountStatus {
  ACTIVE = 1,
  DISABLED = 2,
  UNSETTLED = 3,
  PENDING_RISK_REVIEW = 7,
  PENDING_SETTLEMENT = 8,
  IN_GRACE_PERIOD = 9,
  PENDING_CLOSURE = 100,
  CLOSED = 101,
}

export interface FundingSourceDetails {
  id: string;
  display_string: string;
  type: number;
}

export interface AdAccount {
  id: string;
  name: string;
  alias?: string;
  currency: string;
  account_status: AccountStatus;
  balance: string;
  spend_cap: string;
  amount_spent: string;
  timezone_name: string;
  timezone_offset_hours_utc: number;
  funding_source_details?: FundingSourceDetails;
  created_time: string;
  business?: { id: string; name: string };
  threshold?: string;
  hidden_admins_count?: number;
}

export interface TokenData {
  token: string;
  capturedAt: number;
  userId?: string;
  userName?: string;
  isExpired?: boolean;
  expiresAt?: number;  // ms timestamp; 0 = never expires
  scopes?: string[];
  appId?: string;
}

export interface AccountInsightsData {
  avgDailySpend: number;  // in currency cents (same unit as balance/amount_spent)
  totalLast7d: number;    // total spend last 7 days in cents
  fetchedAt: number;      // ms timestamp
}

export type InsightsCache = Record<string, AccountInsightsData>;

export interface BusinessManager {
  id: string;
  name: string;
  created_time: string;
  link?: string;
  member_count?: number;
  system_user_count?: number;
  hidden_admins?: number;
}

export interface BMember {
  id: string;
  name: string;
  email?: string;
  role?: string;
}

export interface AppSettings {
  refreshInterval: number;
  notifications: boolean;
  showToken: boolean;
}

export interface CachedData<T> {
  data: T;
  fetchedAt: number;
}

export type TabName = 'dashboard' | 'accounts' | 'bm' | 'tools' | 'settings';

export interface GraphAPIError {
  message: string;
  type: string;
  code: number;
  fbtrace_id?: string;
}

export interface GraphAPIPaging {
  cursors: { before: string; after: string };
  next?: string;
  previous?: string;
}

export interface GraphAPIListResponse<T> {
  data: T[];
  paging?: GraphAPIPaging;
  error?: GraphAPIError;
}

export const ACCOUNT_STATUS_LABELS: Record<number, string> = {
  [AccountStatus.ACTIVE]: 'Active',
  [AccountStatus.DISABLED]: 'Disabled',
  [AccountStatus.UNSETTLED]: 'Unsettled',
  [AccountStatus.PENDING_RISK_REVIEW]: 'Risk Review',
  [AccountStatus.PENDING_SETTLEMENT]: 'Pending',
  [AccountStatus.IN_GRACE_PERIOD]: 'Grace Period',
  [AccountStatus.PENDING_CLOSURE]: 'Closing',
  [AccountStatus.CLOSED]: 'Closed',
};
