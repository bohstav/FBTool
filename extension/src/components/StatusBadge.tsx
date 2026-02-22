import React from 'react';
import { AccountStatus, ACCOUNT_STATUS_LABELS } from '../lib/types';

const STATUS_COLORS: Record<number, { dot: string; label: string }> = {
  [AccountStatus.ACTIVE]:              { dot: 'bg-emerald-400',  label: 'text-slate-300' },
  [AccountStatus.DISABLED]:            { dot: 'bg-red-400',      label: 'text-slate-500' },
  [AccountStatus.UNSETTLED]:           { dot: 'bg-yellow-400',   label: 'text-slate-400' },
  [AccountStatus.PENDING_RISK_REVIEW]: { dot: 'bg-orange-400',   label: 'text-slate-400' },
  [AccountStatus.PENDING_SETTLEMENT]:  { dot: 'bg-blue-400',     label: 'text-slate-400' },
  [AccountStatus.IN_GRACE_PERIOD]:     { dot: 'bg-purple-400',   label: 'text-slate-400' },
  [AccountStatus.PENDING_CLOSURE]:     { dot: 'bg-slate-500',    label: 'text-slate-500' },
  [AccountStatus.CLOSED]:              { dot: 'bg-slate-700',    label: 'text-slate-600' },
};

interface StatusBadgeProps {
  status: number;
  className?: string;
}

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const label  = ACCOUNT_STATUS_LABELS[status] ?? 'Unknown';
  const colors = STATUS_COLORS[status] ?? { dot: 'bg-slate-600', label: 'text-slate-500' };

  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap ${className}`}>
      <span className={`w-2 h-2 rounded-full shrink-0 ${colors.dot}`} />
      <span className={`text-xs ${colors.label}`}>{label}</span>
    </span>
  );
}
