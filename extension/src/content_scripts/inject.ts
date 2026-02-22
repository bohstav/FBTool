// Runs in ISOLATED world — has chrome.* API access, no page JS globals.
// Primary token capture is done by service_worker.ts via chrome.scripting.executeScript
// (MAIN world, bypasses Facebook's CSP). This script forwards those tokens and also
// runs a fallback DOM/localStorage scan.

const MSG_TYPE = '__FB_PRO_TOKEN__';

// ── Forward tokens posted by MAIN-world interceptor ──────────────────────────
window.addEventListener('message', (event: MessageEvent) => {
  if (event.source !== window) return;
  if (!event.data || event.data.type !== MSG_TYPE) return;
  const { token } = event.data as { token?: string };
  if (!token) return;
  chrome.runtime.sendMessage({ type: 'TOKEN_CAPTURED', token }).catch(() => {});
});

// ── Fallback: scan DOM + localStorage for embedded tokens ─────────────────────
// Catches cases where the MAIN-world interceptor missed a token that was already
// embedded in the initial page HTML or stored in localStorage.
function scanForTokens(): void {
  let combined = '';
  try { combined += document.documentElement.innerHTML; } catch (_) {}
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k) combined += localStorage.getItem(k) ?? '';
    }
  } catch (_) {}

  const found = new Set<string>();
  // EAAB-prefixed Graph API tokens
  (combined.match(/EAAB[A-Za-z0-9]{40,}/g) ?? []).forEach((t) => found.add(t));
  // access_token=VALUE patterns
  for (const m of combined.matchAll(/access_token=([A-Za-z0-9%_\-.]{20,})/g)) {
    try { found.add(decodeURIComponent(m[1])); } catch (_) {}
  }

  found.forEach((token) => {
    chrome.runtime.sendMessage({ type: 'TOKEN_CAPTURED', token }).catch(() => {});
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', scanForTokens);
} else {
  scanForTokens();
}
window.addEventListener('load', () => setTimeout(scanForTokens, 1500));

// ── Threshold scraping on billing/settings pages ──────────────────────────────
function getAccountIdFromUrl(): string | null {
  const m = window.location.href.match(/act[=_](\d+)/);
  return m ? `act_${m[1]}` : null;
}

function scrapeAndSendThreshold(): void {
  const accountId = getAccountIdFromUrl();
  if (!accountId) return;

  const text = document.body.innerText;
  const patterns = [
    /(?:spending\s+limit|billing\s+threshold|threshold)[:\s]+([€$£¥₺₴][\d,.]+)/i,
    /([€$£¥₺₴][\d,.]+)\s+(?:spending\s+limit|billing\s+threshold)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      chrome.runtime
        .sendMessage({ type: 'THRESHOLD_CAPTURED', accountId, threshold: match[1] })
        .catch(() => {});
      break;
    }
  }
}

function setupThresholdScraping(): void {
  const BILLING_PATHS = ['/billing', '/settings', '/payment'];
  if (!BILLING_PATHS.some((p) => window.location.pathname.includes(p))) return;

  const observer = new MutationObserver(scrapeAndSendThreshold);
  observer.observe(document.body, { childList: true, subtree: true });

  if (document.readyState === 'complete') {
    scrapeAndSendThreshold();
  } else {
    window.addEventListener('load', scrapeAndSendThreshold);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupThresholdScraping);
} else {
  setupThresholdScraping();
}
