import type { AdAccount, TokenData, BusinessManager, AppSettings, CachedData, InsightsCache } from './types';

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const DEFAULT_SETTINGS: AppSettings = {
  refreshInterval: 5,
  notifications: true,
  showToken: false,
};

interface LocalSchema {
  tokenData?: TokenData;
  cachedAccounts?: CachedData<AdAccount[]>;
  cachedBMs?: CachedData<BusinessManager[]>;
  cachedInsights?: CachedData<InsightsCache>;
  settings?: AppSettings;
}

interface SyncSchema {
  accountAliases?: Record<string, string>;
}

function localGet<K extends keyof LocalSchema>(key: K): Promise<LocalSchema[K] | undefined> {
  return new Promise((resolve) => {
    chrome.storage.local.get(key as string, (result) => {
      resolve(result[key as string] as LocalSchema[K]);
    });
  });
}

function localSet<K extends keyof LocalSchema>(key: K, value: LocalSchema[K]): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [key as string]: value }, resolve);
  });
}

function localRemove(key: keyof LocalSchema): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.remove(key as string, resolve);
  });
}

function syncGet<K extends keyof SyncSchema>(key: K): Promise<SyncSchema[K] | undefined> {
  return new Promise((resolve) => {
    chrome.storage.sync.get(key as string, (result) => {
      resolve(result[key as string] as SyncSchema[K]);
    });
  });
}

function syncSet<K extends keyof SyncSchema>(key: K, value: SyncSchema[K]): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.sync.set({ [key as string]: value }, resolve);
  });
}

export const storage = {
  async getToken(): Promise<TokenData | null> {
    return (await localGet('tokenData')) ?? null;
  },

  async setToken(tokenData: TokenData): Promise<void> {
    await localSet('tokenData', tokenData);
  },

  async clearToken(): Promise<void> {
    await localRemove('tokenData');
  },

  async getAliases(): Promise<Record<string, string>> {
    return (await syncGet('accountAliases')) ?? {};
  },

  async setAlias(accountId: string, alias: string): Promise<void> {
    const aliases = await this.getAliases();
    aliases[accountId] = alias;
    await syncSet('accountAliases', aliases);
  },

  async removeAlias(accountId: string): Promise<void> {
    const aliases = await this.getAliases();
    delete aliases[accountId];
    await syncSet('accountAliases', aliases);
  },

  async getCachedAccounts(): Promise<AdAccount[] | null> {
    const cached = await localGet('cachedAccounts');
    if (!cached) return null;
    if (Date.now() - cached.fetchedAt > CACHE_TTL_MS) return null;
    return cached.data;
  },

  async setCachedAccounts(accounts: AdAccount[]): Promise<void> {
    await localSet('cachedAccounts', { data: accounts, fetchedAt: Date.now() });
  },

  async getCachedBMs(): Promise<BusinessManager[] | null> {
    const cached = await localGet('cachedBMs');
    if (!cached) return null;
    if (Date.now() - cached.fetchedAt > CACHE_TTL_MS) return null;
    return cached.data;
  },

  async setCachedBMs(bms: BusinessManager[]): Promise<void> {
    await localSet('cachedBMs', { data: bms, fetchedAt: Date.now() });
  },

  async getCachedInsights(ttlMs = 30 * 60 * 1000): Promise<InsightsCache | null> {
    const cached = await localGet('cachedInsights');
    if (!cached) return null;
    if (Date.now() - cached.fetchedAt > ttlMs) return null;
    return cached.data;
  },

  async setCachedInsights(data: InsightsCache): Promise<void> {
    await localSet('cachedInsights', { data, fetchedAt: Date.now() });
  },

  async getSettings(): Promise<AppSettings> {
    const settings = await localGet('settings');
    return { ...DEFAULT_SETTINGS, ...settings };
  },

  async updateSettings(updates: Partial<AppSettings>): Promise<void> {
    const current = await this.getSettings();
    await localSet('settings', { ...current, ...updates });
  },
};
