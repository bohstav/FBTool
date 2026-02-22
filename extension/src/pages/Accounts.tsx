import React, { useState, useMemo } from 'react';
import {
  Search,
  RefreshCw,
  Download,
  Copy,
  X,
  AlertTriangle,
  Filter,
  Building2,
  Layers,
  Sparkles,
} from 'lucide-react';
import { AccountTable } from '../components/AccountTable';
import { useStore } from '../store';
import { AccountStatus, ACCOUNT_STATUS_LABELS } from '../lib/types';
import { useAccounts } from '../hooks/useAccounts';
import { useInsights } from '../hooks/useInsights';
import { copyToClipboard, stripActPrefix } from '../lib/utils';

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: String(AccountStatus.ACTIVE), label: 'Active' },
  { value: String(AccountStatus.DISABLED), label: 'Disabled' },
  { value: String(AccountStatus.UNSETTLED), label: 'Unsettled' },
  { value: String(AccountStatus.PENDING_RISK_REVIEW), label: 'Risk Review' },
];

export function Accounts() {
  const { accounts, loading, error, refresh, updateAlias } = useAccounts();
  const { searchQuery, setSearchQuery, selectedAccountIds, clearSelection, showToast } =
    useStore();
  const [statusFilter, setStatusFilter] = useState('');
  const [bmFilter, setBmFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [groupByBM, setGroupByBM] = useState(false);

  const accountIds = useMemo(() => accounts.map((a) => a.id), [accounts]);
  const { insights, loading: insightsLoading, error: insightsError, fetch: fetchInsights } =
    useInsights(accountIds);
  const hasInsights = Object.keys(insights).length > 0;

  // Unique BM names for the filter dropdown
  const bmNames = useMemo(() => {
    const names = new Set<string>();
    accounts.forEach((a) => { if (a.business?.name) names.add(a.business.name); });
    return Array.from(names).sort();
  }, [accounts]);

  const filtered = useMemo(() => {
    let result = accounts;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (a) =>
          a.displayName.toLowerCase().includes(q) ||
          a.id.includes(q) ||
          a.name.toLowerCase().includes(q) ||
          (a.business?.name ?? '').toLowerCase().includes(q)
      );
    }
    if (statusFilter) {
      result = result.filter((a) => String(a.account_status) === statusFilter);
    }
    if (bmFilter) {
      result = result.filter((a) => a.business?.name === bmFilter);
    }
    return result;
  }, [accounts, searchQuery, statusFilter, bmFilter]);

  // Group accounts by BM name for the grouped view
  const groupedAccounts = useMemo(() => {
    if (!groupByBM) return null;
    const groups = new Map<string, typeof filtered>();
    for (const acc of filtered) {
      const key = acc.business?.name ?? '— No Business Manager';
      const list = groups.get(key) ?? [];
      list.push(acc);
      groups.set(key, list);
    }
    return Array.from(groups.entries()).sort(([a], [b]) => {
      if (a.startsWith('—')) return 1;
      if (b.startsWith('—')) return -1;
      return a.localeCompare(b);
    });
  }, [filtered, groupByBM]);

  function exportCSV() {
    const rows = [
      ['ID', 'Name', 'Alias', 'Business Manager', 'Status', 'Currency', 'Balance', 'Threshold', 'Amount Spent', 'Payment', 'Timezone'],
      ...filtered.map((a) => [
        stripActPrefix(a.id),
        a.name,
        a.alias ?? '',
        a.business?.name ?? '',
        ACCOUNT_STATUS_LABELS[a.account_status] ?? String(a.account_status),
        a.currency,
        a.balance,
        a.threshold ?? '',
        a.amount_spent,
        a.funding_source_details?.display_string ?? '',
        a.timezone_name,
      ]),
    ];
    const csv = rows.map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fb-accounts.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  function copySelectedIds() {
    const ids = Array.from(selectedAccountIds).map(stripActPrefix).join('\n');
    copyToClipboard(ids);
    showToast(`Copied ${selectedAccountIds.size} account IDs`, 'success');
  }

  const activeFilterCount = [statusFilter, bmFilter].filter(Boolean).length;

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="p-3 border-b border-slate-800 space-y-2 shrink-0">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search accounts…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-surface-overlay rounded border border-slate-700 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-brand transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
          {/* Filter toggle */}
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`p-1.5 rounded border transition-colors ${
              showFilters || activeFilterCount > 0
                ? 'border-brand text-brand'
                : 'border-slate-700 text-slate-500 hover:text-slate-300'
            }`}
            title="Filters"
          >
            <Filter className="w-3.5 h-3.5" />
            {activeFilterCount > 0 && (
              <span className="sr-only">{activeFilterCount} active</span>
            )}
          </button>
          {/* Group by BM */}
          <button
            onClick={() => setGroupByBM((v) => !v)}
            className={`p-1.5 rounded border transition-colors ${
              groupByBM
                ? 'border-brand text-brand'
                : 'border-slate-700 text-slate-500 hover:text-slate-300'
            }`}
            title={groupByBM ? 'Ungroup' : 'Group by Business Manager'}
          >
            <Layers className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => refresh(true)}
            disabled={loading}
            className="p-1.5 rounded border border-slate-700 text-slate-500 hover:text-slate-300 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => fetchInsights(false)}
            disabled={insightsLoading || accounts.length === 0}
            className={`p-1.5 rounded border transition-colors ${
              hasInsights
                ? 'border-brand text-brand'
                : 'border-slate-700 text-slate-500 hover:text-slate-300'
            }`}
            title={hasInsights ? 'Insights loaded — click to refresh' : 'Load spend insights'}
          >
            {insightsLoading ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
          </button>
          <button
            onClick={exportCSV}
            className="p-1.5 rounded border border-slate-700 text-slate-500 hover:text-slate-300 transition-colors"
            title="Export CSV"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-2 gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2 py-1.5 bg-surface-overlay rounded border border-slate-700 text-xs text-slate-300 outline-none focus:border-brand"
            >
              {STATUS_FILTER_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <select
              value={bmFilter}
              onChange={(e) => setBmFilter(e.target.value)}
              className="px-2 py-1.5 bg-surface-overlay rounded border border-slate-700 text-xs text-slate-300 outline-none focus:border-brand"
            >
              <option value="">All BMs</option>
              {bmNames.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>
            {filtered.length} of {accounts.length} accounts
            {groupByBM && groupedAccounts && ` · ${groupedAccounts.length} BMs`}
          </span>
          {selectedAccountIds.size > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={copySelectedIds}
                className="flex items-center gap-1 text-brand hover:text-brand-light"
              >
                <Copy className="w-3 h-3" />
                Copy {selectedAccountIds.size} IDs
              </button>
              <button onClick={clearSelection} className="text-slate-600 hover:text-slate-400">
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="m-3 flex items-start gap-2 p-3 rounded-lg bg-red-950/50 border border-red-800 text-xs text-red-400">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
      {insightsError && (
        <div className="mx-3 mt-1 flex items-start gap-2 p-2 rounded-lg bg-orange-950/50 border border-orange-800 text-xs text-orange-400">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>Insights: {insightsError}</span>
        </div>
      )}

      {/* Table / Grouped view */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-500 text-sm gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            Loading accounts…
          </div>
        ) : groupByBM && groupedAccounts ? (
          <div>
            {groupedAccounts.map(([bmName, bmAccounts]) => (
              <div key={bmName}>
                <div className="sticky top-0 z-10 bg-surface border-b border-slate-800 px-3 py-1.5 flex items-center gap-2">
                  <Building2 className="w-3 h-3 text-brand shrink-0" />
                  <span className="text-xs font-semibold text-slate-300 truncate">{bmName}</span>
                  <span className="text-[10px] text-slate-600 shrink-0 ml-auto">
                    {bmAccounts.length}
                  </span>
                </div>
                <AccountTable accounts={bmAccounts} onRename={updateAlias} insights={hasInsights ? insights : undefined} />
              </div>
            ))}
          </div>
        ) : (
          <AccountTable accounts={filtered} onRename={updateAlias} insights={hasInsights ? insights : undefined} />
        )}
      </div>
    </div>
  );
}
