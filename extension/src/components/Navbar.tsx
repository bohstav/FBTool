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
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
  { id: 'accounts', label: 'Accounts', icon: <CreditCard className="w-4 h-4" /> },
  { id: 'bm', label: 'BM', icon: <Building2 className="w-4 h-4" /> },
  { id: 'tools', label: 'Tools', icon: <Wrench className="w-4 h-4" /> },
  { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
];

export function Navbar() {
  const { activeTab, setActiveTab } = useStore();

  return (
    <nav className="flex border-b border-slate-800 bg-surface shrink-0">
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors ${
              isActive
                ? 'text-brand border-b-2 border-brand -mb-px'
                : 'text-slate-500 hover:text-slate-300'
            }`}
            title={tab.label}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
