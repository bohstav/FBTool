/// <reference types="vite/client" />
import React from 'react';
import { createRoot } from 'react-dom/client';
import panelStyles from '../sidebar/index.css?inline';
import { App } from '../sidebar/App';

// ── Debug: proves the module loaded. Check DevTools console (F12) ────────────
console.warn('[FBPRO] panel.tsx loaded ✓', new Date().toISOString());

const PANEL_W = 420;
let isOpen = false;
let toggleBtn: HTMLButtonElement | null = null;
let panelHost: HTMLDivElement | null = null;

// ─────────────────────────────────────────────────────────────────────────────

function mount(): void {
  console.warn('[FBPRO] mount() called, body =', document.body?.tagName);
  if (document.getElementById('__fbpro_toggle')) return;

  // ── Toggle tab — lives directly in page DOM, styled with all:initial ───────
  // This bypasses any shadow-DOM/fixed-positioning quirks entirely.
  toggleBtn = document.createElement('button');
  toggleBtn.id = '__fbpro_toggle';
  setToggleStyle(false);
  toggleBtn.title = 'FB Ads Manager Pro';
  renderToggleContent(false);
  document.body.appendChild(toggleBtn);

  // ── Panel host — shadow DOM so FB styles can't bleed in ───────────────────
  panelHost = document.createElement('div');
  panelHost.id = '__fbpro_panel';
  setPanelStyle(false);

  const shadow = panelHost.attachShadow({ mode: 'open' });

  // Load IBM Plex Sans via a <link> so Facebook's CSP can block it cleanly
  // rather than throwing on an @import rule inside a <style> tag.
  const fontLink = document.createElement('link');
  fontLink.rel = 'stylesheet';
  fontLink.href = 'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap';
  shadow.appendChild(fontLink);

  const styleEl = document.createElement('style');
  // Strip the @import rule from the inlined CSS — font is loaded via <link> above.
  styleEl.textContent = panelStyles.replace(/@import\s+url\([^)]*\)[^;]*;?\s*/g, '');
  shadow.appendChild(styleEl);

  const container = document.createElement('div');
  container.style.cssText = 'height:100%;overflow:hidden;background:#161616;display:flex;flex-direction:column;';
  shadow.appendChild(container);

  document.body.appendChild(panelHost);

  try {
    createRoot(container).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  } catch (err) {
    console.error('[FBPRO] React render failed:', err);
    return;
  }

  toggleBtn.addEventListener('click', doToggle);
}

function doToggle(): void {
  isOpen = !isOpen;
  if (!panelHost || !toggleBtn) return;
  setPanelStyle(isOpen);
  setToggleStyle(isOpen);
  renderToggleContent(isOpen);
}

// ─── Style helpers ────────────────────────────────────────────────────────────

function setToggleStyle(open: boolean): void {
  if (!toggleBtn) return;
  // Using setAttribute so every rule is explicit — nothing inherits from the FB page.
  const right = open ? `${PANEL_W}px` : '0px';
  const bg = open ? '#1e293b' : '#00B894';
  const shadow = open
    ? '-3px 0 20px rgba(0,0,0,0.5)'
    : '-3px 0 20px rgba(0,184,148,0.4)';
  toggleBtn.setAttribute(
    'style',
    `all:initial;` +
    `position:fixed;` +
    `top:50%;` +
    `right:${right};` +
    `transform:translateY(-50%);` +
    `width:34px;` +
    `height:88px;` +
    `background:${bg};` +
    `border:none;` +
    `border-radius:10px 0 0 10px;` +
    `cursor:pointer;` +
    `z-index:2147483647;` +
    `display:flex;` +
    `flex-direction:column;` +
    `align-items:center;` +
    `justify-content:center;` +
    `gap:5px;` +
    `color:white;` +
    `font-family:-apple-system,BlinkMacSystemFont,sans-serif;` +
    `box-shadow:${shadow};` +
    `transition:right 0.3s cubic-bezier(0.4,0,0.2,1),background 0.2s,box-shadow 0.2s;` +
    `overflow:hidden;`
  );
}

function renderToggleContent(open: boolean): void {
  if (!toggleBtn) return;
  if (open) {
    toggleBtn.innerHTML =
      `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" style="display:block">` +
      `<path d="M9 18l6-6-6-6"/></svg>`;
  } else {
    toggleBtn.innerHTML =
      `<span style="font-size:9px;font-weight:700;letter-spacing:1.5px;writing-mode:vertical-rl;` +
      `text-orientation:mixed;color:white;user-select:none;line-height:1;">ADS</span>` +
      `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" style="display:block">` +
      `<path d="M15 18l-6-6 6-6"/></svg>`;
  }
}

function setPanelStyle(open: boolean): void {
  if (!panelHost) return;
  panelHost.setAttribute(
    'style',
    `position:fixed;` +
    `top:0;` +
    `right:${open ? '0' : `-${PANEL_W}px`};` +
    `width:${PANEL_W}px;` +
    `height:100%;` +
    `z-index:2147483646;` +
    `transition:right 0.3s cubic-bezier(0.4,0,0.2,1);` +
    `box-shadow:-4px 0 48px rgba(0,0,0,0.7);` +
    `overflow:hidden;`
  );
}

// ─── Message / keyboard ───────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg: { type: string }) => {
  if (msg.type === 'TOGGLE_PANEL') doToggle();
  return false;
});

document.addEventListener('keydown', (e: KeyboardEvent) => {
  if (e.key === 'Escape' && isOpen) doToggle();
});

// ─── Bootstrap ───────────────────────────────────────────────────────────────

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mount);
} else {
  mount();
}
