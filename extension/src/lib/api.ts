import type { AdAccount, BusinessManager, BMember, GraphAPIListResponse, InsightsCache } from './types';

const GRAPH_API_BASE = 'https://graph.facebook.com/v21.0';

export class FacebookAPIError extends Error {
  code: number;
  type?: string;
  fbtrace_id?: string;

  constructor(error: { message: string; code: number; type?: string; fbtrace_id?: string }) {
    super(error.message);
    this.name = 'FacebookAPIError';
    this.code = error.code;
    this.type = error.type;
    this.fbtrace_id = error.fbtrace_id;
  }
}

async function graphFetch<T>(
  endpoint: string,
  token: string,
  params: Record<string, string> = {}
): Promise<T> {
  const url = new URL(`${GRAPH_API_BASE}${endpoint}`);
  url.searchParams.set('access_token', token);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const response = await fetch(url.toString());
  const data = (await response.json()) as T & { error?: { message: string; code: number; type?: string; fbtrace_id?: string } };

  if (data.error) {
    throw new FacebookAPIError(data.error);
  }

  return data;
}

async function graphFetchPaginated<T>(
  endpoint: string,
  token: string,
  params: Record<string, string> = {}
): Promise<T[]> {
  const items: T[] = [];
  let cursor: string | null = null;

  do {
    const reqParams: Record<string, string> = { ...params, limit: '100' };
    if (cursor) reqParams.after = cursor;

    const data = await graphFetch<GraphAPIListResponse<T>>(endpoint, token, reqParams);

    items.push(...(data.data || []));
    cursor = data.paging?.next ? data.paging.cursors.after : null;
  } while (cursor);

  return items;
}

const AD_ACCOUNT_FIELDS = [
  'id',
  'name',
  'currency',
  'account_status',
  'balance',
  'spend_cap',
  'amount_spent',
  'timezone_name',
  'timezone_offset_hours_utc',
  'funding_source_details',
  'created_time',
  'business',
].join(',');

export async function fetchAdAccounts(token: string): Promise<AdAccount[]> {
  return graphFetchPaginated<AdAccount>('/me/adaccounts', token, {
    fields: AD_ACCOUNT_FIELDS,
  });
}

export async function fetchBusinessManagers(token: string): Promise<BusinessManager[]> {
  return graphFetchPaginated<BusinessManager>('/me/businesses', token, {
    fields: 'id,name,created_time,link',
  });
}

export async function fetchBMMembers(businessId: string, token: string): Promise<BMember[]> {
  return graphFetchPaginated<BMember>(`/${businessId}/members`, token, {
    fields: 'id,name,email',
  });
}

export async function fetchBMSystemUsers(businessId: string, token: string): Promise<BMember[]> {
  return graphFetchPaginated<BMember>(`/${businessId}/system_users`, token, {
    fields: 'id,name,role',
  });
}

export async function detectHiddenAdmins(businessId: string, token: string): Promise<number> {
  try {
    const [members, systemUsers] = await Promise.all([
      fetchBMMembers(businessId, token),
      fetchBMSystemUsers(businessId, token),
    ]);

    const memberIds = new Set(members.map((m) => m.id));
    return systemUsers.filter((su) => !memberIds.has(su.id)).length;
  } catch {
    return 0;
  }
}

export async function fetchTokenInfo(token: string): Promise<{ id: string; name: string }> {
  return graphFetch<{ id: string; name: string }>('/me', token, {
    fields: 'id,name',
  });
}

export async function debugToken(token: string): Promise<{
  expiresAt: number;
  isValid: boolean;
  scopes: string[];
  appId: string;
}> {
  const data = await graphFetch<{
    data: {
      expires_at: number;
      is_valid: boolean;
      scopes: string[];
      app_id: string;
    };
  }>('/debug_token', token, { input_token: token });
  return {
    expiresAt: data.data.expires_at ? data.data.expires_at * 1000 : 0,
    isValid: data.data.is_valid,
    scopes: data.data.scopes ?? [],
    appId: data.data.app_id,
  };
}

export async function fetchInsightsBatch(accountIds: string[], token: string): Promise<InsightsCache> {
  const BATCH_SIZE = 50;
  const result: InsightsCache = {};

  for (let i = 0; i < accountIds.length; i += BATCH_SIZE) {
    const chunk = accountIds.slice(i, i + BATCH_SIZE);
    const batch = chunk.map((id) => ({
      method: 'GET',
      relative_url: `${id}/insights?fields=spend&date_preset=last_7d&level=account&time_increment=1`,
    }));

    const formData = new URLSearchParams();
    formData.set('access_token', token);
    formData.set('batch', JSON.stringify(batch));

    const response = await fetch(`${GRAPH_API_BASE}/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
    });

    const batchResults = (await response.json()) as Array<{ code: number; body: string } | null>;

    for (let j = 0; j < chunk.length; j++) {
      const res = batchResults[j];
      if (!res || res.code !== 200) continue;
      try {
        const body = JSON.parse(res.body) as {
          data?: Array<{ spend: string; date_start: string; date_stop: string }>;
          error?: unknown;
        };
        if (body.error || !body.data) continue;
        const days = body.data;
        const totalLast7d = days.reduce((sum, d) => sum + Math.round(parseFloat(d.spend) * 100), 0);
        const avgDailySpend = days.length > 0 ? totalLast7d / days.length : 0;
        result[chunk[j]] = { avgDailySpend, totalLast7d, fetchedAt: Date.now() };
      } catch {
        // skip this account
      }
    }
  }

  return result;
}

export async function validateToken(token: string): Promise<boolean> {
  try {
    await fetchTokenInfo(token);
    return true;
  } catch (err) {
    if (err instanceof FacebookAPIError && err.code === 190) {
      return false;
    }
    throw err;
  }
}

export function formatCurrency(amount: string, currency: string): string {
  const num = parseFloat(amount) / 100;
  if (isNaN(num)) return `${currency} -`;
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(num);
  } catch {
    return `${currency} ${num.toFixed(2)}`;
  }
}
