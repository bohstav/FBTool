import React, { useEffect } from 'react';
import { Navbar } from '../components/Navbar';
import { Dashboard } from '../pages/Dashboard';
import { Accounts } from '../pages/Accounts';
import { BM } from '../pages/BM';
import { Tools } from '../pages/Tools';
import { Settings } from '../pages/Settings';
import { useStore } from '../store';
import { sendMessage } from '../lib/utils';
import { CheckCircle, Info, XCircle, X } from 'lucide-react';
import type { AppSettings } from '../lib/types';

export function App() {
  const { activeTab, toast, clearToast } = useStore();

  // Load settings on mount (with retry — service worker may be sleeping)
  useEffect(() => {
    sendMessage<{ settings?: AppSettings }>({ type: 'GET_SETTINGS' })
      .then((res) => {
        if (res?.settings) useStore.getState().setSettings(res.settings);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="flex flex-col h-full bg-surface overflow-hidden" style={{ minHeight: '100vh' }}>
      {/* Header */}
      <header className="flex items-center px-3 py-2 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded bg-brand flex items-center justify-center text-white font-bold text-xs">
            F
          </div>
          <span className="text-sm font-semibold text-slate-200">Ads Manager Pro</span>
        </div>
      </header>

      {/* Navigation */}
      <Navbar />

      {/* Content */}
      <main className="flex-1 overflow-hidden">
        {activeTab === 'dashboard' && (
          <div className="h-full overflow-y-auto">
            <Dashboard />
          </div>
        )}
        {activeTab === 'accounts' && (
          <div className="h-full flex flex-col overflow-hidden">
            <Accounts />
          </div>
        )}
        {activeTab === 'bm' && (
          <div className="h-full overflow-y-auto">
            <BM />
          </div>
        )}
        {activeTab === 'tools' && (
          <div className="h-full overflow-y-auto">
            <Tools />
          </div>
        )}
        {activeTab === 'settings' && (
          <div className="h-full overflow-y-auto">
            <Settings />
          </div>
        )}
      </main>

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-4 left-3 right-3 flex items-center gap-2 p-3 rounded-lg border text-sm shadow-lg z-50 ${
            toast.type === 'success'
              ? 'bg-emerald-950 border-emerald-800 text-emerald-300'
              : toast.type === 'error'
                ? 'bg-red-950 border-red-800 text-red-300'
                : 'bg-slate-800 border-slate-700 text-slate-300'
          }`}
        >
          {toast.type === 'success' && <CheckCircle className="w-4 h-4 shrink-0" />}
          {toast.type === 'error' && <XCircle className="w-4 h-4 shrink-0" />}
          {toast.type === 'info' && <Info className="w-4 h-4 shrink-0" />}
          <span className="flex-1">{toast.message}</span>
          <button onClick={clearToast} className="opacity-60 hover:opacity-100">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
