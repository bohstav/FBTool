import React, { useEffect } from 'react';
import { RefreshCw, Building2, Users, AlertTriangle, Copy, ExternalLink } from 'lucide-react';
import { useBusinessManagers } from '../hooks/useAccounts';
import { copyToClipboard } from '../lib/utils';

export function BM() {
  const { businessManagers, loading, error, refresh } = useBusinessManagers();

  useEffect(() => {
    if (businessManagers.length === 0 && !loading && !error) {
      refresh(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="p-3 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
          <Building2 className="w-3.5 h-3.5" />
          Business Managers
        </h2>
        <button
          onClick={() => refresh(true)}
          disabled={loading}
          className="p-1 rounded text-slate-500 hover:text-slate-300 hover:bg-surface-overlay transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-950/50 border border-red-800 text-xs text-red-400">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-12 text-slate-500 text-sm gap-2">
          <RefreshCw className="w-4 h-4 animate-spin" />
          Loading business managers…
        </div>
      )}

      {!loading && businessManagers.length === 0 && !error && (
        <div className="text-center py-12 text-slate-500 text-sm">
          <Building2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p>No business managers found</p>
          <button
            onClick={() => refresh(true)}
            className="mt-2 text-brand hover:underline text-xs"
          >
            Fetch business managers
          </button>
        </div>
      )}

      <div className="space-y-2">
        {businessManagers.map((bm) => (
          <div
            key={bm.id}
            className="p-3 bg-slate-900 border-l-4 border-l-slate-700 hover:border-l-brand border-b border-slate-800 transition-colors"
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-200 truncate">{bm.name}</p>
                <p className="text-xs font-mono text-slate-500">{bm.id}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => copyToClipboard(bm.id)}
                  className="p-1 rounded text-slate-500 hover:text-slate-300 hover:bg-surface-overlay transition-colors"
                  title="Copy BM ID"
                >
                  <Copy className="w-3 h-3" />
                </button>
                <button
                  onClick={() => chrome.runtime.sendMessage({ type: 'OPEN_TAB', url: `https://business.facebook.com/overview?business_id=${bm.id}` })}
                  className="p-1 rounded text-slate-500 hover:text-brand hover:bg-surface-overlay transition-colors"
                  title="Open in Business Manager"
                >
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              {bm.member_count != null && (
                <div className="flex items-center gap-1 text-slate-400">
                  <Users className="w-3 h-3" />
                  <span>{bm.member_count} members</span>
                </div>
              )}

              {bm.hidden_admins != null && (
                <div
                  className={`flex items-center gap-1 ${
                    bm.hidden_admins > 0 ? 'text-orange-400' : 'text-slate-500'
                  }`}
                >
                  <Users className="w-3 h-3" />
                  <span>
                    {bm.hidden_admins} hidden admin{bm.hidden_admins !== 1 ? 's' : ''}
                  </span>
                </div>
              )}

              {bm.created_time && (
                <div className="text-slate-600 col-span-2">
                  Created {new Date(bm.created_time).toLocaleDateString()}
                </div>
              )}
            </div>

            {(bm.hidden_admins ?? 0) > 0 && (
              <div className="mt-2 p-2 bg-orange-950/40 border-l-2 border-l-orange-400 text-xs text-orange-400">
                ⚠ {bm.hidden_admins} hidden admin(s) detected — system users not visible as regular members.
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
