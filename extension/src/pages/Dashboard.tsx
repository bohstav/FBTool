import React from 'react';
import {
  RefreshCw,
  TrendingUp,
  CreditCard,
  AlertTriangle,
  Copy,
  ExternalLink,
  Building2,
  Clock,
  MapPin,
  Wallet,
  ShieldAlert,
} from 'lucide-react';
import { TokenStatus } from '../components/TokenStatus';
import { StatusBadge } from '../components/StatusBadge';
import { useStore } from '../store';
import { AccountStatus } from '../lib/types';
import { formatCurrency } from '../lib/api';
import { formatRelativeTime, copyToClipboard, openInAdsManager, stripActPrefix, computeHealthScore } from '../lib/utils';
import { useAccounts } from '../hooks/useAccounts';
import { useInsights } from '../hooks/useInsights';
import type { AdAccount } from '../lib/types';

type AccountWithDisplay = AdAccount & { displayName: string };

export function Dashboard() {
  const { accounts, loading, refresh, error } = useAccounts();
  const { lastAccountsFetch } = useStore();
  const accountIds = React.useMemo(() => accounts.map((a) => a.id), [accounts]);
  const { insights } = useInsights(accountIds);
  const hasInsights = Object.keys(insights).length > 0;

  // Detect which account the user is currently viewing from the page URL
  const currentAccountId = React.useMemo(() => {
    const m = window.location.href.match(/act[=_](\d+)/);
    return m ? `act_${m[1]}` : null;
  }, []);

  const currentAccount = React.useMemo((): AccountWithDisplay | null => {
    if (!currentAccountId) return null;
    return accounts.find((a) => a.id === currentAccountId) ?? null;
  }, [accounts, currentAccountId]);

  const stats = React.useMemo(() => {
    const active = accounts.filter((a) => a.account_status === AccountStatus.ACTIVE).length;
    const disabled = accounts.filter((a) => a.account_status === AccountStatus.DISABLED).length;
    const flagged = accounts.filter((a) =>
      [AccountStatus.UNSETTLED, AccountStatus.PENDING_RISK_REVIEW].includes(
        a.account_status as AccountStatus
      )
    ).length;

    const byCurrency: Record<string, { balance: number; spent: number; velocity7d: number }> = {};
    for (const acc of accounts) {
      const b = parseFloat(acc.balance) / 100 || 0;
      const s = parseFloat(acc.amount_spent) / 100 || 0;
      const v = hasInsights && insights[acc.id] ? insights[acc.id].totalLast7d / 100 : 0;
      if (!byCurrency[acc.currency]) byCurrency[acc.currency] = { balance: 0, spent: 0, velocity7d: 0 };
      byCurrency[acc.currency].balance += b;
      byCurrency[acc.currency].spent += s;
      byCurrency[acc.currency].velocity7d += v;
    }

    // Health scores
    const healthCounts: Record<'AB' | 'CDF', number> = { AB: 0, CDF: 0 };
    const atRisk: typeof accounts = [];
    for (const acc of accounts) {
      const insightData = insights[acc.id];
      const h = computeHealthScore({ ...acc, avgDailySpend: insightData?.avgDailySpend });
      if (h.grade === 'A' || h.grade === 'B') healthCounts.AB++;
      else healthCounts.CDF++;

      // At-risk: runway < 7 days
      if (insightData && insightData.avgDailySpend > 0) {
        const balance = parseFloat(acc.balance);
        const runway = balance / insightData.avgDailySpend;
        if (runway < 7 && runway > 0) atRisk.push(acc);
      }
    }

    return { active, disabled, flagged, total: accounts.length, byCurrency, healthCounts, atRisk };
  }, [accounts, insights, hasInsights]);

  return (
    <div className="p-3 space-y-3">
      {/* Token */}
      <TokenStatus />

      {/* Current account card */}
      {currentAccount && (
        <div className="rounded-lg border border-brand/30 bg-brand/5 overflow-hidden">
          <div className="px-3 py-2 border-b border-brand/20 flex items-center justify-between">
            <span className="text-[10px] font-semibold text-brand uppercase tracking-wider">
              Current Account
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => copyToClipboard(stripActPrefix(currentAccount.id))}
                className="p-1 rounded text-slate-500 hover:text-slate-300 hover:bg-surface-overlay transition-colors"
                title="Copy ID"
              >
                <Copy className="w-3 h-3" />
              </button>
              <button
                onClick={() => openInAdsManager(currentAccount.id)}
                className="p-1 rounded text-slate-500 hover:text-brand hover:bg-surface-overlay transition-colors"
                title="Open in Ads Manager"
              >
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </div>
          <div className="px-3 py-2.5 space-y-2">
            {/* Name + status */}
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-100 truncate">
                  {currentAccount.displayName}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[10px] font-mono text-slate-500">
                    {stripActPrefix(currentAccount.id)}
                  </span>
                </div>
              </div>
              <StatusBadge status={currentAccount.account_status} />
            </div>

            {/* Financials grid */}
            <div className="grid grid-cols-2 gap-1.5">
              <InfoTile
                icon={<Wallet className="w-3 h-3" />}
                label="Balance"
                value={formatCurrency(currentAccount.balance, currentAccount.currency)}
                highlight
              />
              <InfoTile
                icon={<TrendingUp className="w-3 h-3" />}
                label="Amount Spent"
                value={formatCurrency(currentAccount.amount_spent, currentAccount.currency)}
              />
              {currentAccount.spend_cap && currentAccount.spend_cap !== '0' && (
                <InfoTile
                  icon={<ShieldAlert className="w-3 h-3" />}
                  label="Spend Cap"
                  value={formatCurrency(currentAccount.spend_cap, currentAccount.currency)}
                />
              )}
              {currentAccount.threshold && (
                <InfoTile
                  icon={<CreditCard className="w-3 h-3" />}
                  label="Threshold"
                  value={currentAccount.threshold}
                />
              )}
            </div>

            {/* Meta */}
            <div className="space-y-1 pt-1 border-t border-slate-800">
              <MetaRow icon={<CreditCard className="w-3 h-3" />} label="Currency" value={currentAccount.currency} />
              {currentAccount.funding_source_details?.display_string && (
                <MetaRow
                  icon={<CreditCard className="w-3 h-3" />}
                  label="Payment"
                  value={currentAccount.funding_source_details.display_string}
                />
              )}
              {currentAccount.timezone_name && (
                <MetaRow
                  icon={<MapPin className="w-3 h-3" />}
                  label="Timezone"
                  value={`${currentAccount.timezone_name.split('/').pop()?.replace(/_/g, ' ')} (UTC${currentAccount.timezone_offset_hours_utc >= 0 ? '+' : ''}${currentAccount.timezone_offset_hours_utc})`}
                />
              )}
              {currentAccount.business && (
                <MetaRow
                  icon={<Building2 className="w-3 h-3" />}
                  label="Business"
                  value={currentAccount.business.name}
                />
              )}
              {currentAccount.created_time && (
                <MetaRow
                  icon={<Clock className="w-3 h-3" />}
                  label="Created"
                  value={new Date(currentAccount.created_time).toLocaleDateString()}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Refresh row */}
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Account Summary{stats.total > 0 && ` · ${stats.total}`}
        </h2>
        <div className="flex items-center gap-2">
          {lastAccountsFetch && (
            <span className="text-[10px] text-slate-600">
              {formatRelativeTime(lastAccountsFetch)}
            </span>
          )}
          <button
            onClick={() => refresh(true)}
            disabled={loading}
            className="p-1 rounded text-slate-500 hover:text-slate-300 hover:bg-surface-overlay transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-950/50 border border-red-800 text-xs text-red-400">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Health summary */}
      <div className="grid grid-cols-3 gap-2">
        <StatCard
          label="Active"
          value={loading ? '…' : String(stats.active)}
          accent="text-emerald-400"
          bg="bg-emerald-950/30"
          border="border-emerald-900"
        />
        <StatCard
          label="Disabled"
          value={loading ? '…' : String(stats.disabled)}
          accent="text-red-400"
          bg="bg-red-950/30"
          border="border-red-900"
        />
        <StatCard
          label="Flagged"
          value={loading ? '…' : String(stats.flagged)}
          accent="text-orange-400"
          bg="bg-orange-950/30"
          border="border-orange-900"
        />
      </div>

      {/* Portfolio Health */}
      {!loading && stats.total > 0 && (
        <div className="p-2.5 rounded-lg bg-surface-raised border border-slate-800">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
            Portfolio Health
          </p>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <span className="text-sm font-bold text-emerald-400">{stats.healthCounts.AB}</span>
              <span className="text-[10px] text-slate-500">A/B grade</span>
            </div>
            <div className="w-px h-4 bg-slate-700" />
            <div className="flex items-center gap-1">
              <span className="text-sm font-bold text-orange-400">{stats.healthCounts.CDF}</span>
              <span className="text-[10px] text-slate-500">C/D/F grade</span>
            </div>
          </div>
        </div>
      )}

      {/* Totals by currency */}
      {!loading && Object.keys(stats.byCurrency).length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5" />
            Balances &amp; Spend
          </h3>
          {Object.entries(stats.byCurrency).map(([currency, { balance, spent, velocity7d }]) => (
            <div
              key={currency}
              className="flex items-center justify-between p-2.5 rounded-lg bg-surface-raised border border-slate-800"
            >
              <div className="flex items-center gap-2">
                <CreditCard className="w-3.5 h-3.5 text-slate-600" />
                <span className="text-xs font-medium text-slate-400">{currency}</span>
              </div>
              <div className="text-right">
                <p className="text-sm font-mono text-slate-200">
                  {formatCurrency(String(balance * 100), currency)}
                </p>
                <p className="text-[10px] text-slate-500">
                  Spent: {formatCurrency(String(spent * 100), currency)}
                </p>
                {hasInsights && velocity7d > 0 && (
                  <p className="text-[10px] text-brand">
                    7d: {formatCurrency(String(velocity7d * 100), currency)}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* At-risk accounts */}
      {hasInsights && !loading && stats.atRisk.length > 0 && (
        <div className="space-y-1.5">
          <h3 className="text-xs font-semibold text-red-500 uppercase tracking-wider flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            At-Risk ({stats.atRisk.length})
          </h3>
          {stats.atRisk.map((acc) => {
            const insightData = insights[acc.id];
            const runway = insightData && insightData.avgDailySpend > 0
              ? parseFloat(acc.balance) / insightData.avgDailySpend
              : null;
            const displayName = (acc as AccountWithDisplay).displayName ?? acc.name;
            return (
              <div
                key={acc.id}
                className="flex items-center justify-between px-2.5 py-2 rounded-lg bg-red-950/30 border border-red-900"
              >
                <p className="text-xs text-slate-300 truncate flex-1 mr-2">{displayName}</p>
                {runway !== null && (
                  <span className="text-[10px] font-medium text-red-400 shrink-0">
                    ~{Math.floor(runway)}d
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!loading && accounts.length === 0 && !error && (
        <div className="text-center py-8 text-slate-500 text-sm">
          <p>No accounts loaded.</p>
          <button
            onClick={() => refresh(true)}
            className="mt-2 text-brand hover:underline text-xs"
          >
            Fetch accounts
          </button>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
  bg,
  border,
}: {
  label: string;
  value: string;
  accent: string;
  bg: string;
  border: string;
}) {
  return (
    <div className={`p-2.5 rounded-lg ${bg} border ${border}`}>
      <p className={`text-lg font-bold ${accent}`}>{value}</p>
      <p className="text-[10px] text-slate-500 mt-0.5">{label}</p>
    </div>
  );
}

function InfoTile({
  icon,
  label,
  value,
  highlight = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="p-2 rounded bg-surface-overlay border border-slate-800">
      <div className="flex items-center gap-1 text-slate-500 mb-0.5">
        {icon}
        <span className="text-[9px] uppercase tracking-wider">{label}</span>
      </div>
      <p className={`text-xs font-mono font-medium ${highlight ? 'text-slate-100' : 'text-slate-300'}`}>
        {value}
      </p>
    </div>
  );
}

function MetaRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-slate-600 shrink-0">{icon}</span>
      <span className="text-slate-600 shrink-0 w-14">{label}</span>
      <span className="text-slate-400 truncate">{value}</span>
    </div>
  );
}
