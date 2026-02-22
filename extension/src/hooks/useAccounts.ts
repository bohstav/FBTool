import { useEffect, useCallback } from 'react';
import { useStore } from '../store';
import { sendMessage } from '../lib/utils';
import type { AdAccount } from '../lib/types';

export function useAccounts() {
  const {
    accounts,
    accountsLoading,
    accountsError,
    aliases,
    setAccounts,
    setAccountsLoading,
    setAccountsError,
    setAliases,
    setAlias,
    removeAlias,
    showToast,
  } = useStore();

  const loadAliases = useCallback(async () => {
    try {
      const res = await sendMessage<{ aliases?: Record<string, string> }>({ type: 'GET_ALIASES' });
      if (res?.aliases) setAliases(res.aliases);
    } catch {
      // Non-critical: aliases just won't load
    }
  }, [setAliases]);

  const fetchAccounts = useCallback(
    async (force = false) => {
      setAccountsLoading(true);
      setAccountsError(null);
      try {
        const res = await sendMessage<{ accounts?: AdAccount[]; error?: string }>({
          type: 'FETCH_ACCOUNTS',
          force,
        });
        if (res?.error) {
          setAccountsError(res.error);
        } else {
          setAccounts(res?.accounts ?? []);
        }
      } catch {
        setAccountsError('Cannot reach background service. Reload the extension.');
      } finally {
        setAccountsLoading(false);
      }
    },
    [setAccounts, setAccountsLoading, setAccountsError]
  );

  useEffect(() => {
    loadAliases();
    fetchAccounts();
  }, [loadAliases, fetchAccounts]);

  const updateAlias = useCallback(
    async (accountId: string, alias: string) => {
      // Optimistic update so the UI responds instantly
      setAlias(accountId, alias);
      try {
        await sendMessage({ type: 'SET_ALIAS', accountId, alias });
        showToast('Account renamed', 'success');
      } catch {
        // Rollback
        removeAlias(accountId);
        showToast('Failed to save alias — try again', 'error');
      }
    },
    [setAlias, removeAlias, showToast]
  );

  const deleteAlias = useCallback(
    async (accountId: string) => {
      removeAlias(accountId);
      try {
        await sendMessage({ type: 'REMOVE_ALIAS', accountId });
      } catch {
        showToast('Failed to remove alias', 'error');
      }
    },
    [removeAlias, showToast]
  );

  const accountsWithAliases = accounts.map((account) => ({
    ...account,
    displayName: aliases[account.id] || account.name,
    alias: aliases[account.id],
  }));

  return {
    accounts: accountsWithAliases,
    loading: accountsLoading,
    error: accountsError,
    aliases,
    refresh: (force = true) => fetchAccounts(force),
    updateAlias,
    deleteAlias,
  };
}

export function useBusinessManagers() {
  const {
    businessManagers,
    bmsLoading,
    bmsError,
    setBusinessManagers,
    setBmsLoading,
    setBmsError,
    showToast,
  } = useStore();

  const fetchBMs = useCallback(
    async (force = false) => {
      setBmsLoading(true);
      setBmsError(null);
      try {
        const res = await sendMessage<{ bms?: unknown[]; error?: string }>({
          type: 'FETCH_BMS',
          force,
        });
        if (res?.error) {
          setBmsError(res.error);
        } else {
          setBusinessManagers((res?.bms as typeof businessManagers) ?? []);
        }
      } catch {
        setBmsError('Cannot reach background service. Reload the extension.');
      } finally {
        setBmsLoading(false);
      }
    },
    [setBusinessManagers, setBmsLoading, setBmsError]
  );

  return {
    businessManagers,
    loading: bmsLoading,
    error: bmsError,
    refresh: (force = true) => fetchBMs(force),
    showToast,
  };
}
