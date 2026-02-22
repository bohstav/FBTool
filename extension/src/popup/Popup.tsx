import React, { useEffect, useState } from 'react';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  ExternalLink,
  RefreshCw,
  CreditCard,
} from 'lucide-react';
import type { TokenData, AdAccount } from '../lib/types';
import { AccountStatus } from '../lib/types';
import { formatRelativeTime } from '../lib/utils';

interface QuickStats {
  total: number;
  active: number;
  disabled: number;
}

export function Popup() {
  const [tokenData, setTokenData] = useState<TokenData | null>(null);
  const [stats, setStats] = useState<QuickStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [tokenRes, accountsRes] = await Promise.all([
        chrome.runtime.sendMessage({ type: 'GET_TOKEN' }),
        chrome.runtime.sendMessage({ type: 'FETCH_ACCOUNTS', force: false }),
      ]);

      setTokenData((tokenRes?.tokenData as TokenData | null) ?? null);

      if (accountsRes?.accounts) {
        const accounts = accountsRes.accounts as AdAccount[];
        setStats({
          total: accounts.length,
          active: accounts.filter((a) => a.account_status === AccountStatus.ACTIVE).length,
          disabled: accounts.filter((a) => a.account_status === AccountStatus.DISABLED).length,
        });
      }

      setLoading(false);
    }
    load();
  }, []);

  async function openSidePanel() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      await chrome.sidePanel.open({ tabId: tab.id });
      window.close();
    }
  }

  const isExpired = tokenData?.isExpired;
  const hasToken = tokenData && !isExpired;

  return (
    <div className="bg-surface p-3 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded bg-brand flex items-center justify-center text-white font-bold text-xs">
            F
          </div>
          <span className="text-sm font-semibold text-slate-200">Ads Manager Pro</span>
        </div>
        <button
          onClick={openSidePanel}
          className="flex items-center gap-1 text-xs text-brand hover:text-brand-light transition-colors"
        >
          <ExternalLink className="w-3 h-3" />
          Full View
        </button>
      </div>

      {/* Token status */}
      <div
        className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs ${
          !tokenData
            ? 'bg-red-950/30 border-red-800'
            : isExpired
              ? 'bg-red-950/30 border-red-800'
              : 'bg-emerald-950/30 border-emerald-800'
        }`}
      >
        {!tokenData ? (
          <XCircle className="w-4 h-4 text-red-400 shrink-0" />
        ) : isExpired ? (
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
        ) : (
          <CheckCircle className="w-4 h-4 text-brand shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          {!tokenData ? (
            <span className="text-red-400">No token — visit facebook.com</span>
          ) : isExpired ? (
            <span className="text-red-400">Token expired — visit facebook.com</span>
          ) : (
            <>
              <span className="text-emerald-400">Token active</span>
              {tokenData.userName && (
                <span className="text-slate-500 ml-1">· {tokenData.userName}</span>
              )}
              <p className="text-slate-600 text-[10px]">
                {formatRelativeTime(tokenData.capturedAt)}
              </p>
            </>
          )}
        </div>
      </div>

      {/* Quick stats */}
      {loading ? (
        <div className="flex items-center justify-center py-4 text-slate-500 gap-1.5 text-xs">
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          Loading…
        </div>
      ) : stats ? (
        <div className="grid grid-cols-3 gap-2">
          <MiniStat
            label="Total"
            value={stats.total}
            icon={<CreditCard className="w-3 h-3" />}
            color="text-slate-400"
          />
          <MiniStat
            label="Active"
            value={stats.active}
            icon={<CheckCircle className="w-3 h-3" />}
            color="text-emerald-400"
          />
          <MiniStat
            label="Disabled"
            value={stats.disabled}
            icon={<XCircle className="w-3 h-3" />}
            color="text-red-400"
          />
        </div>
      ) : (
        !hasToken && (
          <p className="text-xs text-slate-600 text-center py-2">
            Capture a token to see account stats.
          </p>
        )
      )}

      {/* Open sidebar button */}
      <button
        onClick={openSidePanel}
        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-brand hover:bg-brand-dark text-white text-sm font-medium transition-colors"
      >
        <ExternalLink className="w-3.5 h-3.5" />
        Open Full Dashboard
      </button>
    </div>
  );
}

function MiniStat({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="p-2 rounded-lg bg-surface-raised border border-slate-800 text-center">
      <div className={`flex items-center justify-center mb-0.5 ${color}`}>{icon}</div>
      <p className={`text-base font-bold ${color}`}>{value}</p>
      <p className="text-[10px] text-slate-600">{label}</p>
    </div>
  );
}
