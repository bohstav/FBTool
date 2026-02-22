import React from 'react';
import { AccountStatus, ACCOUNT_STATUS_LABELS } from '../lib/types';

const STATUS_STYLES: Record<number, string> = {
  [AccountStatus.ACTIVE]:
    'bg-emerald-950 text-emerald-400 border-emerald-800',
  [AccountStatus.DISABLED]:
    'bg-red-950 text-red-400 border-red-800',
  [AccountStatus.UNSETTLED]:
    'bg-yellow-950 text-yellow-400 border-yellow-800',
  [AccountStatus.PENDING_RISK_REVIEW]:
    'bg-orange-950 text-orange-400 border-orange-800',
  [AccountStatus.PENDING_SETTLEMENT]:
    'bg-blue-950 text-blue-400 border-blue-800',
  [AccountStatus.IN_GRACE_PERIOD]:
    'bg-purple-950 text-purple-400 border-purple-800',
  [AccountStatus.PENDING_CLOSURE]:
    'bg-slate-800 text-slate-400 border-slate-700',
  [AccountStatus.CLOSED]:
    'bg-slate-900 text-slate-500 border-slate-800',
};

interface StatusBadgeProps {
  status: number;
  className?: string;
}

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const label = ACCOUNT_STATUS_LABELS[status] ?? 'Unknown';
  const style = STATUS_STYLES[status] ?? 'bg-slate-800 text-slate-400 border-slate-700';

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap ${style} ${className}`}
    >
      {label}
    </span>
  );
}
