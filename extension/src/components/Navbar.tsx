import React from 'react';
import {
  LayoutDashboard,
  CreditCard,
  Building2,
  Wrench,
  Settings,
} from 'lucide-react';
import { useStore } from '../store';
import type { TabName } from '../lib/types';

const TABS: { id: TabName; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-3.5 h-3.5" /> },
  { id: 'accounts',  label: 'Accounts',  icon: <CreditCard className="w-3.5 h-3.5" /> },
  { id: 'bm',        label: 'BM',        icon: <Building2 className="w-3.5 h-3.5" /> },
  { id: 'tools',     label: 'Tools',     icon: <Wrench className="w-3.5 h-3.5" /> },
  { id: 'settings',  label: 'Settings',  icon: <Settings className="w-3.5 h-3.5" /> },
];

export function Navbar() {
  const { activeTab, setActiveTab } = useStore();

  return (
    <nav className="flex bg-surface border-b border-slate-800 shrink-0">
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            title={tab.label}
            className={`
              relative flex-1 flex flex-col items-center gap-1 py-2.5
              text-[10px] font-medium tracking-wide transition-colors
              ${isActive
                ? 'text-slate-100 bg-surface'
                : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900'
              }
            `}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {isActive && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand" />
            )}
          </button>
        );
      })}
    </nav>
  );
}
