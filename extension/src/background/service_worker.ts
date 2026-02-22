import { storage } from '../lib/storage';
import {
  fetchAdAccounts,
  fetchBusinessManagers,
  fetchTokenInfo,
  detectHiddenAdmins,
  debugToken,
  fetchInsightsBatch,
  FacebookAPIError,
} from '../lib/api';
import type { TokenData, AppSettings } from '../lib/types';

// ─── Setup ───────────────────────────────────────────────────────────────────

// Inject MAIN-world interceptor on every Facebook page load.
// chrome.scripting.executeScript bypasses the page's CSP entirely — unlike
// inline <script> tag injection which Facebook's strict script-src blocks.
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'loading') return;
  if (!tab.url?.includes('facebook.com')) return;

  chrome.scripting
    .executeScript({
      target: { tabId },
      world: 'MAIN' as chrome.scripting.ExecutionWorld,
      injectImmediately: true,
      // func is serialised by Chrome via .toString() and run in the page context.
      // It MUST be completely self-contained — no references to outer scope.
      func: function fbproInterceptor() {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const w = window as any;
        if (w.__fbpro_i) return;
        w.__fbpro_i = true;

        const T = '__FB_PRO_TOKEN__';
        const seen = new Set<string>();

        function emit(tok: string): void {
          if (!tok || tok.length < 20 || seen.has(tok)) return;
          seen.add(tok);
          window.postMessage({ type: T, token: tok }, '*');
        }

        function scanText(s: string): void {
          const m1 = s.match(/EAAB[A-Za-z0-9]{40,}/g);
          if (m1) m1.forEach(emit);
          const m2 = [...s.matchAll(/access_token=([A-Za-z0-9%_\-.]+)/g)];
          m2.forEach((m) => { try { emit(decodeURIComponent(m[1])); } catch (_) {} });
        }

        function extractUrl(url: string): void {
          try {
            const t = new URL(url, location.href).searchParams.get('access_token');
            if (t) emit(t);
          } catch (_) {}
          if (url.includes('EAAB')) scanText(url);
        }

        // Patch fetch
        const origFetch = window.fetch;
        window.fetch = function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
          const url = input instanceof Request ? input.url : String(input);
          if (url.includes('graph.facebook') || url.includes('access_token')) extractUrl(url);
          const p = origFetch.call(this, input, init);
          p.then((r) => {
            if (r.url.includes('access_token') || r.url.includes('oauth')) {
              r.clone().text().then(scanText).catch(() => {});
            }
          }).catch(() => {});
          return p;
        };

        // Patch XHR
        const origOpen = XMLHttpRequest.prototype.open;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (XMLHttpRequest.prototype.open as any) = function (this: XMLHttpRequest, method: string, url: string | URL) {
          const s = String(url);
          if (s.includes('graph.facebook') || s.includes('access_token')) extractUrl(s);
          // eslint-disable-next-line prefer-rest-params
          return (origOpen as (...a: unknown[]) => void).apply(this, arguments as unknown as unknown[]);
        };

        // Scan globals + page HTML
        function tryGlobals(): void {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const win = window as any;
          try {
            const auth = win.FB?.getAuthResponse?.();
            if (auth?.accessToken) emit(auth.accessToken);
          } catch (_) {}
          ['__accessToken', '_fb_token', '__fbAccessToken'].forEach((k) => {
            if (typeof win[k] === 'string') emit(win[k]);
          });
          try { scanText(document.documentElement.innerHTML); } catch (_) {}
        }

        tryGlobals();
        document.addEventListener('DOMContentLoaded', tryGlobals);
        window.addEventListener('load', () => {
          tryGlobals();
          setTimeout(tryGlobals, 2000);
        });
      },
    })
    .catch(() => {});
});

// Extension icon click → toggle the floating panel in the active FB tab
chrome.action.onClicked.addListener((tab) => {
  if (tab.id) {
    chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_PANEL' }).catch(() => {
      // Tab doesn't have our content script (not a FB page) — ignore
    });
  }
});

// ─── Message Router ───────────────────────────────────────────────────────────

type MessageHandler = (msg: Record<string, unknown>) => Promise<unknown>;

const handlers: Record<string, MessageHandler> = {
  OPEN_TAB: handleOpenTab,
  TOKEN_CAPTURED: handleTokenCaptured,
  GET_TOKEN: handleGetToken,
  CLEAR_TOKEN: handleClearToken,
  VALIDATE_TOKEN: handleValidateToken,
  FETCH_ACCOUNTS: handleFetchAccounts,
  FETCH_BMS: handleFetchBMs,
  FETCH_INSIGHTS: handleFetchInsights,
  GET_SETTINGS: handleGetSettings,
  UPDATE_SETTINGS: handleUpdateSettings,
  GET_ALIASES: handleGetAliases,
  SET_ALIAS: handleSetAlias,
  REMOVE_ALIAS: handleRemoveAlias,
  THRESHOLD_CAPTURED: handleThresholdCaptured,
};

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const handler = handlers[message.type as string];
  if (!handler) {
    sendResponse({ error: `Unknown message type: ${message.type}` });
    return true;
  }

  handler(message as Record<string, unknown>)
    .then(sendResponse)
    .catch((err: Error) => sendResponse({ error: err.message }));

  return true; // keep message channel open for async response
});

// ─── Handlers ────────────────────────────────────────────────────────────────

async function handleOpenTab(msg: Record<string, unknown>) {
  const url = msg.url as string;
  if (!url) return { ok: false };
  await chrome.tabs.create({ url });
  return { ok: true };
}

async function handleTokenCaptured(msg: Record<string, unknown>) {
  const token = msg.token as string;
  if (!token || typeof token !== 'string' || token.length < 20) {
    return { ok: false, reason: 'invalid_token' };
  }

  const existing = await storage.getToken();
  if (existing?.token === token) return { ok: true, duplicate: true };

  let userId: string | undefined;
  let userName: string | undefined;

  try {
    const info = await fetchTokenInfo(token);
    userId = info.id;
    userName = info.name;
  } catch (err) {
    if (err instanceof FacebookAPIError && err.code === 190) {
      return { ok: false, reason: 'token_expired' };
    }
    // If we can't verify but token looks valid, store it anyway
  }

  const tokenData: TokenData = { token, capturedAt: Date.now(), userId, userName };

  try {
    const debug = await debugToken(token);
    tokenData.expiresAt = debug.expiresAt;
    tokenData.scopes = debug.scopes;
    tokenData.appId = debug.appId;
  } catch {
    // Non-critical — lifecycle info just won't be shown
  }

  await storage.setToken(tokenData);

  // Notify all open extension pages
  chrome.runtime.sendMessage({ type: 'TOKEN_UPDATED', tokenData }).catch(() => {});

  return { ok: true, userName };
}

async function handleGetToken() {
  const tokenData = await storage.getToken();
  return { tokenData };
}

async function handleClearToken() {
  await storage.clearToken();
  chrome.runtime.sendMessage({ type: 'TOKEN_CLEARED' }).catch(() => {});
  return { ok: true };
}

async function handleValidateToken() {
  const tokenData = await storage.getToken();
  if (!tokenData) return { valid: false, reason: 'no_token' };

  try {
    const info = await fetchTokenInfo(tokenData.token);
    const updated: TokenData = { ...tokenData, userId: info.id, userName: info.name };

    try {
      const debug = await debugToken(tokenData.token);
      updated.expiresAt = debug.expiresAt;
      updated.scopes = debug.scopes;
      updated.appId = debug.appId;
    } catch {
      // Non-critical
    }

    await storage.setToken(updated);
    chrome.runtime.sendMessage({ type: 'TOKEN_UPDATED', tokenData: updated }).catch(() => {});
    return { valid: true, userName: info.name };
  } catch (err) {
    if (err instanceof FacebookAPIError && err.code === 190) {
      const expired: TokenData = { ...tokenData, isExpired: true };
      await storage.setToken(expired);
      chrome.runtime.sendMessage({ type: 'TOKEN_EXPIRED' }).catch(() => {});
      return { valid: false, reason: 'expired' };
    }
    return { valid: false, reason: 'unknown' };
  }
}

async function handleFetchAccounts(msg: Record<string, unknown>) {
  const tokenData = await storage.getToken();
  if (!tokenData) return { error: 'No token available. Navigate to facebook.com to capture one.' };
  if (tokenData.isExpired) return { error: 'Token is expired. Navigate to facebook.com to refresh.' };

  if (!msg.force) {
    const cached = await storage.getCachedAccounts();
    if (cached) return { accounts: cached, fromCache: true };
  }

  try {
    const accounts = await fetchAdAccounts(tokenData.token);
    await storage.setCachedAccounts(accounts);
    return { accounts };
  } catch (err) {
    if (err instanceof FacebookAPIError) {
      if (err.code === 190) {
        const expired: TokenData = { ...tokenData, isExpired: true };
        await storage.setToken(expired);
        chrome.runtime.sendMessage({ type: 'TOKEN_EXPIRED' }).catch(() => {});
        return { error: 'Token expired. Navigate to facebook.com to re-capture.', code: 190 };
      }
      if (err.code === 17 || err.code === 4) {
        return { error: 'Rate limited by Facebook API. Try again in a few minutes.', code: err.code };
      }
      return { error: err.message, code: err.code };
    }
    return { error: 'Failed to fetch accounts. Check your connection.' };
  }
}

async function handleFetchBMs(msg: Record<string, unknown>) {
  const tokenData = await storage.getToken();
  if (!tokenData) return { error: 'No token available.' };
  if (tokenData.isExpired) return { error: 'Token is expired.' };

  if (!msg.force) {
    const cached = await storage.getCachedBMs();
    if (cached) return { bms: cached, fromCache: true };
  }

  try {
    const bms = await fetchBusinessManagers(tokenData.token);

    // Detect hidden admins for each BM (parallel)
    const enriched = await Promise.all(
      bms.map(async (bm) => {
        const hidden = await detectHiddenAdmins(bm.id, tokenData.token);
        return { ...bm, hidden_admins: hidden };
      })
    );

    await storage.setCachedBMs(enriched);
    return { bms: enriched };
  } catch (err) {
    if (err instanceof FacebookAPIError) {
      return { error: err.message, code: err.code };
    }
    return { error: 'Failed to fetch business managers.' };
  }
}

async function handleGetSettings() {
  const settings = await storage.getSettings();
  return { settings };
}

async function handleUpdateSettings(msg: Record<string, unknown>) {
  await storage.updateSettings(msg.settings as Partial<AppSettings>);
  return { ok: true };
}

async function handleGetAliases() {
  const aliases = await storage.getAliases();
  return { aliases };
}

async function handleSetAlias(msg: Record<string, unknown>) {
  await storage.setAlias(msg.accountId as string, msg.alias as string);
  return { ok: true };
}

async function handleRemoveAlias(msg: Record<string, unknown>) {
  await storage.removeAlias(msg.accountId as string);
  return { ok: true };
}

async function handleFetchInsights(msg: Record<string, unknown>) {
  const tokenData = await storage.getToken();
  if (!tokenData) return { error: 'No token available.' };
  if (tokenData.isExpired) return { error: 'Token is expired.' };

  const accountIds = msg.accountIds as string[];
  if (!accountIds?.length) return { insights: {} };

  if (!msg.force) {
    const cached = await storage.getCachedInsights();
    if (cached) return { insights: cached };
  }

  try {
    const insights = await fetchInsightsBatch(accountIds, tokenData.token);
    await storage.setCachedInsights(insights);
    return { insights };
  } catch (err) {
    if (err instanceof FacebookAPIError) {
      if (err.code === 17 || err.code === 4) {
        return { error: 'Rate limited by Facebook API. Try again in a few minutes.', code: err.code };
      }
      return { error: err.message, code: err.code };
    }
    return { error: 'Failed to fetch insights.' };
  }
}

async function handleThresholdCaptured(msg: Record<string, unknown>) {
  const { accountId, threshold } = msg as { accountId: string; threshold: string };
  const cached = await storage.getCachedAccounts();
  if (cached) {
    const updated = cached.map((a) => (a.id === accountId ? { ...a, threshold } : a));
    await storage.setCachedAccounts(updated);
  }
  return { ok: true };
}
