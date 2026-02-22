import React, { useState, useEffect, CSSProperties } from 'react';
import { CheckCircle, Info, XCircle, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { Dashboard } from '../pages/Dashboard';
import { Accounts } from '../pages/Accounts';
import { BM } from '../pages/BM';
import { Tools } from '../pages/Tools';
import { Settings } from '../pages/Settings';
import { useStore } from '../store';

const PANEL_W = 420;

export function PanelApp() {
  const [isOpen, setIsOpen] = useState(false);
  const { activeTab, toast, clearToast } = useStore();

  // Load settings on first mount
  useEffect(() => {
    chrome.runtime.sendMessage({ type: 'GET_SETTINGS' }).then((res) => {
      if (res?.settings) useStore.getState().setSettings(res.settings);
    });
  }, []);

  // Extension icon click sends TOGGLE_PANEL → relayed here as a DOM event
  useEffect(() => {
    const handler = () => setIsOpen((v) => !v);
    document.addEventListener('__fbpro_toggle__', handler);
    return () => document.removeEventListener('__fbpro_toggle__', handler);
  }, []);

  // ESC to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) setIsOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen]);

  const tabStyle: CSSProperties = {
    pointerEvents: 'auto',
    position: 'fixed',
    top: '50%',
    right: isOpen ? PANEL_W : 0,
    transform: 'translateY(-50%)',
    width: 34,
    height: 88,
    background: isOpen ? '#1e293b' : '#00B894',
    border: 'none',
    borderRadius: '10px 0 0 10px',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    color: 'white',
    boxShadow: isOpen
      ? '-3px 0 20px rgba(0,0,0,0.5)'
      : '-3px 0 20px rgba(0,184,148,0.4)',
    transition: 'right 0.3s cubic-bezier(0.4,0,0.2,1), background 0.2s, box-shadow 0.2s',
    zIndex: 1,
  };

  const panelStyle: CSSProperties = {
    pointerEvents: isOpen ? 'auto' : 'none',
    position: 'fixed',
    top: 0,
    right: isOpen ? 0 : -PANEL_W,
    width: PANEL_W,
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    background: '#0f172a',
    boxShadow: '-4px 0 48px rgba(0,0,0,0.7)',
    transition: 'right 0.3s cubic-bezier(0.4,0,0.2,1)',
    overflow: 'hidden',
  };

  return (
    <div style={{ height: '100%', width: '100%', pointerEvents: 'none' }}>

      {/* ── Floating tab ─────────────────────────────────────────── */}
      <button
        style={tabStyle}
        onClick={() => setIsOpen((v) => !v)}
        title={isOpen ? 'Close (Esc)' : 'FB Ads Manager Pro'}
      >
        {isOpen ? (
          <ChevronRight style={{ width: 16, height: 16, flexShrink: 0 }} />
        ) : (
          <>
            <span
              style={{
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: 1.5,
                writingMode: 'vertical-rl',
                textOrientation: 'mixed',
                userSelect: 'none',
                lineHeight: 1,
              }}
            >
              ADS PRO
            </span>
            <ChevronLeft style={{ width: 14, height: 14, flexShrink: 0 }} />
          </>
        )}
      </button>

      {/* ── Sliding panel ────────────────────────────────────────── */}
      <div style={panelStyle}>
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '8px 12px',
            borderBottom: '1px solid #1e293b',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 22,
                height: 22,
                borderRadius: 5,
                background: '#00B894',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: 800,
                fontSize: 13,
                fontFamily: '-apple-system, sans-serif',
              }}
            >
              F
            </div>
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: '#e2e8f0',
                fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
              }}
            >
              Ads Manager Pro
            </span>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            style={{
              marginLeft: 'auto',
              background: 'none',
              border: 'none',
              color: '#64748b',
              cursor: 'pointer',
              padding: 4,
              borderRadius: 4,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <X style={{ width: 14, height: 14 }} />
          </button>
        </div>

        {/* Nav */}
        <Navbar />

        {/* Tab content */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {activeTab === 'dashboard' && (
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <Dashboard />
            </div>
          )}
          {activeTab === 'accounts' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <Accounts />
            </div>
          )}
          {activeTab === 'bm' && (
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <BM />
            </div>
          )}
          {activeTab === 'tools' && (
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <Tools />
            </div>
          )}
          {activeTab === 'settings' && (
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <Settings />
            </div>
          )}
        </div>
      </div>

      {/* ── Toast ────────────────────────────────────────────────── */}
      {toast && (
        <div
          style={{
            pointerEvents: 'auto',
            position: 'fixed',
            bottom: 16,
            right: isOpen ? PANEL_W + 12 : 12,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 14px',
            borderRadius: 8,
            border: '1px solid',
            fontSize: 13,
            fontFamily: '-apple-system, sans-serif',
            boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
            transition: 'right 0.3s ease',
            zIndex: 2,
            ...(toast.type === 'success'
              ? { background: '#022c22', borderColor: '#065f46', color: '#6ee7b7' }
              : toast.type === 'error'
                ? { background: '#2d0000', borderColor: '#7f1d1d', color: '#fca5a5' }
                : { background: '#1e293b', borderColor: '#334155', color: '#94a3b8' }),
          }}
        >
          {toast.type === 'success' && <CheckCircle style={{ width: 16, height: 16, flexShrink: 0 }} />}
          {toast.type === 'error' && <XCircle style={{ width: 16, height: 16, flexShrink: 0 }} />}
          {toast.type === 'info' && <Info style={{ width: 16, height: 16, flexShrink: 0 }} />}
          <span>{toast.message}</span>
          <button
            onClick={clearToast}
            style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0, marginLeft: 4, opacity: 0.6 }}
          >
            <X style={{ width: 12, height: 12 }} />
          </button>
        </div>
      )}
    </div>
  );
}
