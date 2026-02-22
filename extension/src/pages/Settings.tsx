import React, { useState, useEffect } from 'react';
import { Save, Trash2, Eye, EyeOff, RefreshCw, AlertTriangle, Copy } from 'lucide-react';
import { useStore } from '../store';
import { useToken } from '../hooks/useToken';
import { stripActPrefix } from '../lib/utils';

export function Settings() {
  const { settings, setSettings, aliases, removeAlias, showToast } = useStore();
  const { tokenData, hasToken, isExpired, clearToken, setManualToken, validateToken, copyToken } =
    useToken();

  const [manualToken, setManualTokenInput] = useState('');
  const [showManualToken, setShowManualToken] = useState(false);
  const [showStoredToken, setShowStoredToken] = useState(false);
  const [localSettings, setLocalSettings] = useState(settings);
  const [validating, setValidating] = useState(false);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  async function saveSettings() {
    await chrome.runtime.sendMessage({ type: 'UPDATE_SETTINGS', settings: localSettings });
    setSettings(localSettings);
    showToast('Settings saved', 'success');
  }

  async function handleManualToken() {
    if (!manualToken.trim()) return;
    await setManualToken(manualToken.trim());
    setManualTokenInput('');
  }

  async function handleValidate() {
    setValidating(true);
    await validateToken();
    setValidating(false);
  }

  const aliasEntries = Object.entries(aliases);

  return (
    <div className="p-3 space-y-4 pb-6">
      {/* Token Management */}
      <section>
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
          Token Management
        </h2>
        <div className="p-3 rounded-lg bg-surface-raised border border-slate-800 space-y-3">
          {tokenData ? (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-200">
                    {tokenData.userName ?? 'Token stored'}
                  </p>
                  <p className="text-xs text-slate-500">
                    {isExpired ? (
                      <span className="text-red-400">Expired</span>
                    ) : (
                      `Captured ${new Date(tokenData.capturedAt).toLocaleString()}`
                    )}
                  </p>
                  {tokenData.expiresAt !== undefined && (
                    <p className="text-xs text-slate-500 mt-0.5">
                      {tokenData.expiresAt === 0 ? (
                        <span className="text-slate-400">Never expires</span>
                      ) : (
                        <>
                          Expires:{' '}
                          <span className="text-slate-300">
                            {new Date(tokenData.expiresAt).toLocaleString()}
                          </span>
                        </>
                      )}
                    </p>
                  )}
                  {tokenData.scopes && tokenData.scopes.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {tokenData.scopes.map((scope) => (
                        <span
                          key={scope}
                          className="px-1.5 py-0.5 rounded text-[9px] bg-surface-overlay border border-slate-700 text-slate-400"
                        >
                          {scope}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleValidate}
                    disabled={validating}
                    className="p-1.5 rounded border border-slate-700 text-slate-500 hover:text-slate-300 transition-colors"
                    title="Validate token"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${validating ? 'animate-spin' : ''}`} />
                  </button>
                  <button
                    onClick={copyToken}
                    className="p-1.5 rounded border border-slate-700 text-slate-500 hover:text-brand transition-colors"
                    title="Copy token"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setShowStoredToken((v) => !v)}
                    className={`p-1.5 rounded border transition-colors ${
                      showStoredToken
                        ? 'border-brand text-brand'
                        : 'border-slate-700 text-slate-500 hover:text-slate-300'
                    }`}
                    title={showStoredToken ? 'Hide token' : 'Reveal token'}
                  >
                    {showStoredToken ? (
                      <EyeOff className="w-3.5 h-3.5" />
                    ) : (
                      <Eye className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <button
                    onClick={clearToken}
                    className="p-1.5 rounded border border-red-900 text-red-500 hover:text-red-400 hover:border-red-700 transition-colors"
                    title="Clear token"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {showStoredToken && tokenData && (
                <div className="p-2 rounded bg-surface-overlay border border-slate-700">
                  <p className="text-[10px] text-slate-500 mb-1 flex items-center gap-1">
                    <span className="text-yellow-500">⚠</span> Keep this secret
                  </p>
                  <p className="text-xs font-mono text-slate-300 break-all select-all leading-relaxed">
                    {tokenData.token}
                  </p>
                </div>
              )}

              {!hasToken && (
                <div className="flex items-center gap-2 p-2 rounded bg-yellow-950/50 border border-yellow-800 text-xs text-yellow-400">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  Navigate to facebook.com to re-capture a fresh token.
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-slate-400">
              No token stored. Visit facebook.com to auto-capture, or enter one manually below.
            </p>
          )}

          {/* Manual token entry */}
          <div>
            <label className="block text-xs text-slate-500 mb-1">Manual token entry</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type={showManualToken ? 'text' : 'password'}
                  placeholder="EAAxxxxxxxx…"
                  value={manualToken}
                  onChange={(e) => setManualTokenInput(e.target.value)}
                  className="w-full pr-8 pl-2 py-1.5 bg-surface-overlay rounded border border-slate-700 text-xs text-slate-200 placeholder-slate-600 outline-none focus:border-brand font-mono"
                />
                <button
                  onClick={() => setShowManualToken((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500"
                >
                  {showManualToken ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                </button>
              </div>
              <button
                onClick={handleManualToken}
                disabled={!manualToken.trim()}
                className="px-3 py-1.5 rounded bg-brand text-white text-xs font-medium hover:bg-brand-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Preferences */}
      <section>
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
          Preferences
        </h2>
        <div className="p-3 rounded-lg bg-surface-raised border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-300">Cache refresh interval</p>
              <p className="text-xs text-slate-600">How often account data auto-refreshes</p>
            </div>
            <select
              value={localSettings.refreshInterval}
              onChange={(e) =>
                setLocalSettings((s) => ({ ...s, refreshInterval: Number(e.target.value) }))
              }
              className="bg-surface-overlay border border-slate-700 rounded text-xs text-slate-300 px-2 py-1 outline-none focus:border-brand"
            >
              <option value={1}>1 min</option>
              <option value={5}>5 min</option>
              <option value={15}>15 min</option>
              <option value={30}>30 min</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-300">Notifications</p>
              <p className="text-xs text-slate-600">Show alerts for token expiry</p>
            </div>
            <button
              onClick={() =>
                setLocalSettings((s) => ({ ...s, notifications: !s.notifications }))
              }
              className={`relative w-10 h-5 rounded-full transition-colors ${
                localSettings.notifications ? 'bg-brand' : 'bg-slate-700'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                  localSettings.notifications ? 'translate-x-5' : ''
                }`}
              />
            </button>
          </div>

          <button
            onClick={saveSettings}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded bg-brand text-white text-sm font-medium hover:bg-brand-dark transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
            Save Settings
          </button>
        </div>
      </section>

      {/* Account Aliases */}
      <section>
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
          Account Aliases ({aliasEntries.length})
        </h2>
        {aliasEntries.length === 0 ? (
          <p className="text-xs text-slate-600 p-3 rounded-lg bg-surface-raised border border-slate-800">
            No aliases set. Rename accounts from the Accounts tab.
          </p>
        ) : (
          <div className="rounded-lg bg-surface-raised border border-slate-800 divide-y divide-slate-800">
            {aliasEntries.map(([id, alias]) => (
              <div key={id} className="flex items-center gap-2 px-3 py-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-300 truncate">{alias}</p>
                  <p className="text-[10px] font-mono text-slate-600">{stripActPrefix(id)}</p>
                </div>
                <button
                  onClick={() => {
                    removeAlias(id);
                    chrome.runtime.sendMessage({ type: 'REMOVE_ALIAS', accountId: id });
                  }}
                  className="p-1 rounded text-slate-600 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* About */}
      <section>
        <div className="p-3 rounded-lg bg-surface-raised border border-slate-800 text-center">
          <p className="text-xs font-semibold text-brand">FB Ads Manager Pro</p>
          <p className="text-[10px] text-slate-600 mt-0.5">v1.0.0 · Internal Tool · Not for distribution</p>
        </div>
      </section>
    </div>
  );
}
