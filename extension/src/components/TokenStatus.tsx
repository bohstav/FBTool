import React, { useState } from 'react';
import { Copy, RefreshCw, AlertTriangle, CheckCircle, XCircle, Eye, EyeOff } from 'lucide-react';
import { useToken } from '../hooks/useToken';
import { formatRelativeTime } from '../lib/utils';

function ExpiryBadge({ expiresAt }: { expiresAt: number }) {
  if (expiresAt === 0) {
    return <span className="text-[10px] text-slate-500">Never expires</span>;
  }
  const daysLeft = Math.ceil((expiresAt - Date.now()) / 86400000);
  if (daysLeft < 0) return null; // already expired via isExpired flag
  if (daysLeft < 7) {
    return (
      <span className="text-[10px] text-red-400">
        Expires in {daysLeft}d — refresh soon
      </span>
    );
  }
  if (daysLeft < 30) {
    return (
      <span className="text-[10px] text-yellow-400">
        Expires in {daysLeft}d
      </span>
    );
  }
  return (
    <span className="text-[10px] text-emerald-500">
      Expires in {daysLeft}d
    </span>
  );
}

export function TokenStatus() {
  const { tokenData, hasToken, isExpired, isStale, copyToken, clearToken, validateToken } =
    useToken();
  const [showToken, setShowToken] = useState(false);
  const [validating, setValidating] = useState(false);

  const handleValidate = async () => {
    setValidating(true);
    await validateToken();
    setValidating(false);
  };

  if (!tokenData) {
    return (
      <div className="flex items-start gap-3 p-3 bg-slate-900 border-l-4 border-l-slate-600">
        <XCircle className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-300">No token captured</p>
          <p className="text-xs text-slate-500 mt-0.5">
            Navigate to any{' '}
            <span className="text-brand">facebook.com</span> page to auto-capture your token.
          </p>
        </div>
      </div>
    );
  }

  if (isExpired) {
    return (
      <div className="flex items-start gap-3 p-3 bg-slate-900 border-l-4 border-l-red-400">
        <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-red-400">Token expired</p>
          <p className="text-xs text-slate-500 mt-0.5">
            Go to facebook.com to capture a fresh token.
          </p>
        </div>
      </div>
    );
  }

  const accentBorder = isStale ? 'border-l-yellow-400' : 'border-l-brand';
  const statusColor  = isStale ? 'text-yellow-400' : 'text-brand';

  return (
    <div className={`p-3 bg-slate-900 border-l-4 ${accentBorder}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <CheckCircle className={`w-4 h-4 ${statusColor} shrink-0`} />
          <span className={`text-sm font-medium ${statusColor}`}>
            {isStale ? 'Token (possibly stale)' : 'Token active'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleValidate}
            disabled={validating}
            className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-surface-overlay transition-colors"
            title="Validate token"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${validating ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={copyToken}
            className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-surface-overlay transition-colors"
            title="Copy token"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setShowToken((v) => !v)}
            className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-surface-overlay transition-colors"
            title={showToken ? 'Hide token' : 'Show token'}
          >
            {showToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {tokenData.userName && (
        <p className="text-xs text-slate-400 mb-1">
          User: <span className="text-slate-300">{tokenData.userName}</span>
          {tokenData.userId && (
            <span className="text-slate-600"> ({tokenData.userId})</span>
          )}
        </p>
      )}

      {tokenData.expiresAt !== undefined && (
        <p className="mb-1">
          <ExpiryBadge expiresAt={tokenData.expiresAt} />
        </p>
      )}

      <p className="text-xs text-slate-500">
        Captured {formatRelativeTime(tokenData.capturedAt)}
        {isStale && ' — may need refresh'}
      </p>

      {showToken && (
        <div className="mt-2 p-2 bg-slate-800 border-l-2 border-l-slate-600">
          <p className="text-xs font-mono text-slate-300 break-all select-all leading-relaxed">
            {tokenData.token}
          </p>
        </div>
      )}

      {hasToken && (
        <button
          onClick={clearToken}
          className="mt-2 text-xs text-slate-600 hover:text-red-400 transition-colors"
        >
          Clear token
        </button>
      )}
    </div>
  );
}
