// Runs in MAIN world — has full access to page globals and real network calls.
// No chrome.* APIs available here. Communicate via window.postMessage.

(function () {
  'use strict';

  const MSG_TYPE = '__FB_PRO_TOKEN__';
  const seen = new Set<string>();

  function emit(token: string): void {
    if (!token || token.length < 20 || seen.has(token)) return;
    seen.add(token);
    window.postMessage({ type: MSG_TYPE, token }, window.location.origin || '*');
  }

  function extractFromUrl(url: string): void {
    try {
      const parsed = new URL(url, window.location.href);
      const token = parsed.searchParams.get('access_token');
      if (token) emit(token);
    } catch {}
  }

  // ── Intercept fetch ────────────────────────────────────────────────────────
  const origFetch = window.fetch.bind(window);
  window.fetch = function (...args: Parameters<typeof fetch>) {
    const url =
      args[0] instanceof Request
        ? args[0].url
        : typeof args[0] === 'string'
          ? args[0]
          : String(args[0]);

    if (url.includes('graph.facebook.com') || url.includes('access_token')) {
      extractFromUrl(url);
    }

    return origFetch(...args);
  };

  // ── Intercept XHR ─────────────────────────────────────────────────────────
  const origOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (
    method: string,
    url: string | URL,
    async?: boolean,
    username?: string | null,
    password?: string | null
  ) {
    const urlStr = String(url);
    if (urlStr.includes('graph.facebook.com') || urlStr.includes('access_token')) {
      extractFromUrl(urlStr);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (origOpen as any).call(this, method, url, async ?? true, username, password);
  };

  // ── Try FB SDK globals ─────────────────────────────────────────────────────
  type FBWin = Window & {
    FB?: { getAuthResponse?: () => { accessToken?: string } | null };
    __accessToken?: string;
    _fb_token?: string;
    __fbAccessToken?: string;
    DTSG?: string;
  };

  function tryGlobals(): void {
    const win = window as FBWin;
    try {
      const auth = win.FB?.getAuthResponse?.();
      if (auth?.accessToken) emit(auth.accessToken);
    } catch {}
    if (win.__accessToken) emit(win.__accessToken);
    if (win._fb_token) emit(win._fb_token);
    if (win.__fbAccessToken) emit(win.__fbAccessToken);

    // Try to find token in cookies (some FB tools embed it)
    try {
      const cookieMatch = document.cookie.match(/(?:^|;\s*)(?:token|access_token)=([^;]+)/);
      if (cookieMatch) emit(decodeURIComponent(cookieMatch[1]));
    } catch {}
  }

  // Try eagerly and after page fully loads
  tryGlobals();
  document.addEventListener('DOMContentLoaded', tryGlobals);
  window.addEventListener('load', () => {
    tryGlobals();
    setTimeout(tryGlobals, 1500);
    setTimeout(tryGlobals, 4000);
  });
})();
