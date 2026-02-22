import React, { useState, useRef } from 'react';
import {
  Copy,
  ExternalLink,
  Pencil,
  Check,
  X,
  Users,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { useStore } from '../store';
import { formatCurrency } from '../lib/api';
import { copyToClipboard, openInAdsManager, getTimezoneLabel, stripActPrefix, computeHealthScore } from '../lib/utils';
import type { AdAccount, InsightsCache } from '../lib/types';

type SortKey = 'displayName' | 'account_status' | 'currency' | 'balance' | 'amount_spent';
type SortDir = 'asc' | 'desc';

interface AccountTableProps {
  accounts: (AdAccount & { displayName: string })[];
  onRename: (accountId: string, alias: string) => void;
  insights?: InsightsCache;
}

export function AccountTable({ accounts, onRename, insights }: AccountTableProps) {
  const { selectedAccountIds, toggleAccountSelection, selectAllAccounts, clearSelection } =
    useStore();
  const [sortKey, setSortKey] = useState<SortKey>('displayName');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const editRef = useRef<HTMLInputElement>(null);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  const sorted = [...accounts].sort((a, b) => {
    let av: string | number = a[sortKey as keyof typeof a] as string | number;
    let bv: string | number = b[sortKey as keyof typeof b] as string | number;

    if (sortKey === 'balance' || sortKey === 'amount_spent') {
      av = parseFloat(String(av)) || 0;
      bv = parseFloat(String(bv)) || 0;
    }

    if (av < bv) return sortDir === 'asc' ? -1 : 1;
    if (av > bv) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const allSelected = accounts.length > 0 && accounts.every((a) => selectedAccountIds.has(a.id));

  function startEdit(account: AdAccount & { displayName: string }) {
    setEditingId(account.id);
    setEditValue(account.displayName);
    setTimeout(() => editRef.current?.focus(), 50);
  }

  function commitEdit(accountId: string) {
    const trimmed = editValue.trim();
    if (trimmed) onRename(accountId, trimmed);
    setEditingId(null);
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ChevronUp className="w-3 h-3 text-slate-600" />;
    return sortDir === 'asc' ? (
      <ChevronUp className="w-3 h-3 text-brand" />
    ) : (
      <ChevronDown className="w-3 h-3 text-brand" />
    );
  }

  function Th({
    label,
    col,
    className = '',
  }: {
    label: string;
    col?: SortKey;
    className?: string;
  }) {
    return (
      <th
        className={`px-2 py-2 text-left text-[10px] font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap ${col ? 'cursor-pointer select-none hover:text-slate-300' : ''} ${className}`}
        onClick={col ? () => toggleSort(col) : undefined}
      >
        <span className="flex items-center gap-1">
          {label}
          {col && <SortIcon col={col} />}
        </span>
      </th>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500 text-sm">
        No accounts to display
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead className="sticky top-0 bg-surface z-10">
          <tr className="border-b border-slate-800">
            <th className="w-8 px-2 py-2">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={allSelected ? clearSelection : selectAllAccounts}
                className="accent-brand"
              />
            </th>
            <Th label="Account" col="displayName" className="min-w-[160px]" />
            <Th label="Status" col="account_status" />
            <Th label="Health" />
            <Th label="Currency" col="currency" />
            <Th label="Balance" col="balance" />
            <Th label="Spend Cap" />
            <Th label="Spent" col="amount_spent" />
            {insights && <Th label="Avg/day" />}
            {insights && <Th label="Runway" />}
            <Th label="Hidden Admins" />
            <Th label="Payment" />
            <Th label="Timezone" />
            <th className="px-2 py-2 text-left text-[10px] font-medium text-slate-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((account) => {
            const isSelected = selectedAccountIds.has(account.id);
            const isEditing = editingId === account.id;
            const accountInsights = insights?.[account.id];
            const health = computeHealthScore({
              ...account,
              avgDailySpend: accountInsights?.avgDailySpend,
            });
            const spendCap = parseFloat(account.spend_cap);
            const amountSpent = parseFloat(account.amount_spent);
            const spendCapPct = spendCap > 0 ? amountSpent / spendCap : null;
            const balance = parseFloat(account.balance);
            const runwayDays =
              accountInsights && accountInsights.avgDailySpend > 0 && balance > 0
                ? balance / accountInsights.avgDailySpend
                : null;

            return (
              <tr
                key={account.id}
                className={`border-b border-slate-800/50 transition-colors ${
                  isSelected ? 'bg-brand/5' : 'hover:bg-surface-raised'
                }`}
              >
                <td className="px-2 py-2">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleAccountSelection(account.id)}
                    className="accent-brand"
                  />
                </td>

                {/* Account name */}
                <td className="px-2 py-2 max-w-[200px]">
                  {isEditing ? (
                    <div className="flex items-center gap-1">
                      <input
                        ref={editRef}
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') commitEdit(account.id);
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                        className="flex-1 bg-surface-overlay text-slate-200 text-xs px-1.5 py-0.5 rounded border border-brand outline-none min-w-0"
                      />
                      <button onClick={() => commitEdit(account.id)} className="text-brand">
                        <Check className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="text-slate-500"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 group">
                      <span className="text-slate-200 truncate">{account.displayName}</span>
                      {account.alias && (
                        <span className="text-slate-600 truncate text-[10px]">
                          ({account.name})
                        </span>
                      )}
                      <button
                        onClick={() => startEdit(account)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-600 hover:text-slate-400 ml-1 shrink-0"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                  {account.business?.name && (
                    <p className="text-[10px] text-slate-600 truncate">{account.business.name}</p>
                  )}
                  <div className="flex items-center gap-1 mt-0.5 group/id">
                    <span className="text-slate-600 font-mono text-[10px]">
                      {stripActPrefix(account.id)}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); copyToClipboard(stripActPrefix(account.id)); }}
                      className="opacity-0 group-hover/id:opacity-100 transition-opacity text-slate-700 hover:text-slate-400 shrink-0"
                      title="Copy ID"
                    >
                      <Copy className="w-2.5 h-2.5" />
                    </button>
                  </div>
                </td>

                <td className="px-2 py-2">
                  <StatusBadge status={account.account_status} />
                </td>

                <td className="px-2 py-2 text-center">
                  <span
                    title={health.issues.length > 0 ? health.issues.join(' · ') : 'No issues'}
                    className={`inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold cursor-default ${
                      health.grade === 'A'
                        ? 'bg-emerald-900/60 text-emerald-400'
                        : health.grade === 'B'
                        ? 'bg-sky-900/60 text-sky-400'
                        : health.grade === 'C'
                        ? 'bg-yellow-900/60 text-yellow-400'
                        : health.grade === 'D'
                        ? 'bg-orange-900/60 text-orange-400'
                        : 'bg-red-900/60 text-red-400'
                    }`}
                  >
                    {health.grade}
                  </span>
                </td>

                <td className="px-2 py-2 text-slate-400">{account.currency}</td>

                <td className="px-2 py-2 text-slate-200 font-mono whitespace-nowrap">
                  {formatCurrency(account.balance, account.currency)}
                </td>

                <td className="px-2 py-2 min-w-[80px]">
                  {spendCapPct !== null ? (
                    <div
                      title={`${formatCurrency(account.amount_spent, account.currency)} / ${formatCurrency(account.spend_cap, account.currency)}`}
                      className="w-full"
                    >
                      <div className="h-1.5 rounded-full bg-slate-700 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            spendCapPct < 0.5
                              ? 'bg-emerald-500'
                              : spendCapPct < 0.8
                              ? 'bg-yellow-500'
                              : spendCapPct < 0.95
                              ? 'bg-orange-500'
                              : 'bg-red-500'
                          }`}
                          style={{ width: `${Math.min(spendCapPct * 100, 100)}%` }}
                        />
                      </div>
                      <p className="text-[9px] text-slate-500 mt-0.5">
                        {Math.round(spendCapPct * 100)}%
                      </p>
                    </div>
                  ) : (
                    <span className="text-slate-600">—</span>
                  )}
                </td>

                <td className="px-2 py-2 text-slate-200 font-mono whitespace-nowrap">
                  {formatCurrency(account.amount_spent, account.currency)}
                </td>

                {insights && (
                  <td className="px-2 py-2 text-slate-400 whitespace-nowrap">
                    {accountInsights
                      ? `$${(accountInsights.avgDailySpend / 100).toFixed(2)}/d`
                      : '—'}
                  </td>
                )}

                {insights && (
                  <td className="px-2 py-2">
                    {runwayDays !== null ? (
                      <span
                        className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          runwayDays >= 30
                            ? 'bg-emerald-900/50 text-emerald-400'
                            : runwayDays >= 14
                            ? 'bg-yellow-900/50 text-yellow-400'
                            : runwayDays >= 7
                            ? 'bg-orange-900/50 text-orange-400'
                            : 'bg-red-900/50 text-red-400'
                        }`}
                      >
                        {runwayDays >= 30 ? '30d+' : `${Math.floor(runwayDays)}d`}
                      </span>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </td>
                )}

                <td className="px-2 py-2 text-center">
                  {account.hidden_admins_count != null ? (
                    <span
                      className={`inline-flex items-center gap-1 ${
                        account.hidden_admins_count > 0 ? 'text-orange-400' : 'text-slate-500'
                      }`}
                    >
                      <Users className="w-3 h-3" />
                      {account.hidden_admins_count}
                    </span>
                  ) : (
                    <span className="text-slate-600">—</span>
                  )}
                </td>

                <td className="px-2 py-2 text-slate-400 whitespace-nowrap max-w-[120px] truncate">
                  {account.funding_source_details?.display_string ?? '—'}
                </td>

                <td className="px-2 py-2 text-slate-500 whitespace-nowrap">
                  {account.timezone_name
                    ? getTimezoneLabel(account.timezone_name, account.timezone_offset_hours_utc)
                    : '—'}
                </td>

                <td className="px-2 py-2">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => copyToClipboard(stripActPrefix(account.id))}
                      className="p-1 rounded text-slate-500 hover:text-slate-300 hover:bg-surface-overlay transition-colors"
                      title="Copy ID"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => openInAdsManager(account.id)}
                      className="p-1 rounded text-slate-500 hover:text-brand hover:bg-surface-overlay transition-colors"
                      title="Open in Ads Manager"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
