import React from 'react';
import { Copy, ExternalLink } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { formatCurrency } from '../lib/api';
import { copyToClipboard, openInAdsManager } from '../lib/utils';
import type { AdAccount } from '../lib/types';

interface AccountCardProps {
  account: AdAccount & { displayName: string };
}

export function AccountCard({ account }: AccountCardProps) {
  return (
    <div className="p-3 rounded-lg bg-surface-raised border border-slate-800 hover:border-slate-700 transition-colors">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-200 truncate">{account.displayName}</p>
          <p className="text-xs font-mono text-slate-500">{account.id}</p>
        </div>
        <StatusBadge status={account.account_status} />
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs mb-2">
        <div>
          <span className="text-slate-500">Balance</span>
          <p className="text-slate-200 font-mono">
            {formatCurrency(account.balance, account.currency)}
          </p>
        </div>
        <div>
          <span className="text-slate-500">Spent</span>
          <p className="text-slate-200 font-mono">
            {formatCurrency(account.amount_spent, account.currency)}
          </p>
        </div>
        {account.threshold && (
          <div>
            <span className="text-slate-500">Threshold</span>
            <p className="text-slate-200">{account.threshold}</p>
          </div>
        )}
        <div>
          <span className="text-slate-500">Currency</span>
          <p className="text-slate-300">{account.currency}</p>
        </div>
      </div>

      {account.funding_source_details?.display_string && (
        <p className="text-xs text-slate-500 mb-2 truncate">
          {account.funding_source_details.display_string}
        </p>
      )}

      <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
        <button
          onClick={() => copyToClipboard(account.id)}
          className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors"
        >
          <Copy className="w-3 h-3" />
          Copy ID
        </button>
        <button
          onClick={() => openInAdsManager(account.id)}
          className="flex items-center gap-1 text-xs text-slate-500 hover:text-brand transition-colors ml-auto"
        >
          <ExternalLink className="w-3 h-3" />
          Open
        </button>
      </div>
    </div>
  );
}
