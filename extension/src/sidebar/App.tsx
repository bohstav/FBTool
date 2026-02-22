import React, { useEffect } from 'react';
import { Navbar } from '../components/Navbar';
import { Dashboard } from '../pages/Dashboard';
import { Accounts } from '../pages/Accounts';
import { BM } from '../pages/BM';
import { Tools } from '../pages/Tools';
import { Settings } from '../pages/Settings';
import { useStore } from '../store';
import { sendMessage } from '../lib/utils';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';
import type { AppSettings } from '../lib/types';

export function App() {
  const { activeTab, toast, clearToast } = useStore();

  useEffect(() => {
    sendMessage<{ settings?: AppSettings }>({ type: 'GET_SETTINGS' })
      .then((res) => {
        if (res?.settings) useStore.getState().setSettings(res.settings);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="flex flex-col h-full bg-surface overflow-hidden" style={{ minHeight: '100vh' }}>
      {/* Carbon global header */}
      <header className="flex items-center justify-between px-4 h-10 bg-slate-900 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-2.5">
          <span className="text-brand font-bold text-base leading-none">▣</span>
          <span className="text-sm font-semibold text-slate-100 tracking-tight">
            Ads Manager Pro
          </span>
        </div>
        <span className="text-[9px] font-semibold text-brand border border-brand/50 px-1.5 py-px uppercase tracking-widest">
          PRO
        </span>
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

      {/* Carbon toast notification — anchored to bottom, full width, left accent border */}
      {toast && (
        <div
          className={`fixed bottom-0 left-0 right-0 flex items-start gap-3 px-4 py-3.5 text-sm z-50 border-l-4 shadow-lg ${
            toast.type === 'success'
              ? 'bg-slate-900 border-l-emerald-400 text-slate-200'
              : toast.type === 'error'
                ? 'bg-slate-900 border-l-red-400 text-slate-200'
                : 'bg-slate-900 border-l-brand text-slate-200'
          }`}
        >
          <span className="shrink-0 mt-px">
            {toast.type === 'success' && <CheckCircle className="w-4 h-4 text-emerald-400" />}
            {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-red-400" />}
            {toast.type === 'info' && <Info className="w-4 h-4 text-brand" />}
          </span>
          <span className="flex-1 leading-snug">{toast.message}</span>
          <button
            onClick={clearToast}
            className="shrink-0 text-slate-500 hover:text-slate-300 transition-colors mt-px"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
