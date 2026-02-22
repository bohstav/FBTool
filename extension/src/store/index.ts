import { create } from 'zustand';
import type { AdAccount, TokenData, BusinessManager, AppSettings, TabName } from '../lib/types';

interface StoreState {
  // Token
  tokenData: TokenData | null;
  setTokenData: (data: TokenData | null) => void;

  // Accounts
  accounts: AdAccount[];
  accountsLoading: boolean;
  accountsError: string | null;
  lastAccountsFetch: number | null;
  setAccounts: (accounts: AdAccount[]) => void;
  setAccountsLoading: (loading: boolean) => void;
  setAccountsError: (error: string | null) => void;

  // Aliases
  aliases: Record<string, string>;
  setAliases: (aliases: Record<string, string>) => void;
  setAlias: (accountId: string, alias: string) => void;
  removeAlias: (accountId: string) => void;

  // Business Managers
  businessManagers: BusinessManager[];
  bmsLoading: boolean;
  bmsError: string | null;
  setBusinessManagers: (bms: BusinessManager[]) => void;
  setBmsLoading: (loading: boolean) => void;
  setBmsError: (error: string | null) => void;

  // UI
  activeTab: TabName;
  setActiveTab: (tab: TabName) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedAccountIds: Set<string>;
  toggleAccountSelection: (id: string) => void;
  selectAllAccounts: () => void;
  clearSelection: () => void;

  // Settings
  settings: AppSettings;
  setSettings: (settings: AppSettings) => void;
  updateSettings: (updates: Partial<AppSettings>) => void;

  // Notification toast
  toast: { message: string; type: 'success' | 'error' | 'info' } | null;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  clearToast: () => void;
}

export const useStore = create<StoreState>((set, get) => ({
  // Token
  tokenData: null,
  setTokenData: (data) => set({ tokenData: data }),

  // Accounts
  accounts: [],
  accountsLoading: false,
  accountsError: null,
  lastAccountsFetch: null,
  setAccounts: (accounts) => set({ accounts, accountsError: null, lastAccountsFetch: Date.now() }),
  setAccountsLoading: (loading) => set({ accountsLoading: loading }),
  setAccountsError: (error) => set({ accountsError: error, accountsLoading: false }),

  // Aliases
  aliases: {},
  setAliases: (aliases) => set({ aliases }),
  setAlias: (accountId, alias) =>
    set((state) => ({ aliases: { ...state.aliases, [accountId]: alias } })),
  removeAlias: (accountId) =>
    set((state) => {
      const next = { ...state.aliases };
      delete next[accountId];
      return { aliases: next };
    }),

  // Business Managers
  businessManagers: [],
  bmsLoading: false,
  bmsError: null,
  setBusinessManagers: (bms) => set({ businessManagers: bms, bmsError: null }),
  setBmsLoading: (loading) => set({ bmsLoading: loading }),
  setBmsError: (error) => set({ bmsError: error, bmsLoading: false }),

  // UI
  activeTab: 'dashboard',
  setActiveTab: (tab) =>
    set({ activeTab: tab, searchQuery: '', selectedAccountIds: new Set() }),
  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),
  selectedAccountIds: new Set(),
  toggleAccountSelection: (id) =>
    set((state) => {
      const next = new Set(state.selectedAccountIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { selectedAccountIds: next };
    }),
  selectAllAccounts: () =>
    set((state) => ({ selectedAccountIds: new Set(state.accounts.map((a) => a.id)) })),
  clearSelection: () => set({ selectedAccountIds: new Set() }),

  // Settings
  settings: { refreshInterval: 5, notifications: true, showToken: false },
  setSettings: (settings) => set({ settings }),
  updateSettings: (updates) =>
    set((state) => ({ settings: { ...state.settings, ...updates } })),

  // Toast
  toast: null,
  showToast: (message, type = 'info') => {
    set({ toast: { message, type } });
    setTimeout(() => get().clearToast(), 3000);
  },
  clearToast: () => set({ toast: null }),
}));
