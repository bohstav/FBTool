import React, { useState } from 'react';
import { Search, ExternalLink, RefreshCw, AlertCircle } from 'lucide-react';

// Simple domain ban check using FB's own endpoint behavior
async function checkDomainBan(domain: string): Promise<{ banned: boolean; error?: string }> {
  const clean = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const url = `https://graph.facebook.com/v21.0/?id=https://${clean}&fields=og_object`;

  try {
    const res = await fetch(url);
    const data = await res.json() as { error?: { code: number; message: string } };
    if (data.error?.code === 368 || data.error?.message?.toLowerCase().includes('banned')) {
      return { banned: true };
    }
    // If we get back valid og_object data or no specific ban error, assume not banned
    return { banned: false };
  } catch {
    return { banned: false, error: 'Could not check — network error' };
  }
}

export function Tools() {
  const [domain, setDomain] = useState('');
  const [banResult, setBanResult] = useState<{ banned: boolean; error?: string } | null>(null);
  const [checking, setChecking] = useState(false);

  async function handleDomainCheck() {
    if (!domain.trim()) return;
    setChecking(true);
    setBanResult(null);
    const result = await checkDomainBan(domain.trim());
    setBanResult(result);
    setChecking(false);
  }

  return (
    <div className="p-3 space-y-4">
      {/* Domain Ban Checker */}
      <section>
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
          Domain Ban Checker
        </h2>
        <div className="p-3 rounded-lg bg-surface-raised border border-slate-800">
          <div className="flex gap-2 mb-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
              <input
                type="text"
                placeholder="example.com"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleDomainCheck()}
                className="w-full pl-8 pr-3 py-1.5 bg-surface-overlay rounded border border-slate-700 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-brand transition-colors"
              />
            </div>
            <button
              onClick={handleDomainCheck}
              disabled={checking || !domain.trim()}
              className="px-3 py-1.5 rounded bg-brand text-white text-sm font-medium hover:bg-brand-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
            >
              {checking && <RefreshCw className="w-3 h-3 animate-spin" />}
              Check
            </button>
          </div>

          {banResult && (
            <div
              className={`p-2.5 rounded border text-xs flex items-start gap-2 ${
                banResult.error
                  ? 'bg-slate-800 border-slate-700 text-slate-400'
                  : banResult.banned
                    ? 'bg-red-950/50 border-red-800 text-red-400'
                    : 'bg-emerald-950/50 border-emerald-800 text-emerald-400'
              }`}
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                {banResult.error
                  ? banResult.error
                  : banResult.banned
                    ? `${domain} appears to be BANNED on Facebook Ads.`
                    : `${domain} does not appear to be banned.`}
              </span>
            </div>
          )}

          <p className="text-[10px] text-slate-600 mt-2">
            Note: This check uses the Graph API open-graph scraper. False negatives are possible for
            newly banned domains.
          </p>
        </div>
      </section>

      {/* Quick Links */}
      <section>
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
          Quick Links
        </h2>
        <div className="space-y-1.5">
          {QUICK_LINKS.map((link) => (
            <button
              key={link.url}
              onClick={() => chrome.runtime.sendMessage({ type: 'OPEN_TAB', url: link.url })}
              className="w-full flex items-center justify-between p-2.5 rounded-lg bg-surface-raised border border-slate-800 hover:border-slate-700 text-left transition-colors group"
            >
              <div>
                <p className="text-sm text-slate-300 group-hover:text-slate-100">{link.label}</p>
                <p className="text-xs text-slate-600">{link.description}</p>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-slate-600 group-hover:text-brand" />
            </button>
          ))}
        </div>
      </section>

      {/* Currency Reference */}
      <section>
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
          Facebook Ad Currency Codes
        </h2>
        <div className="p-3 rounded-lg bg-surface-raised border border-slate-800">
          <div className="grid grid-cols-3 gap-1 text-xs text-slate-400">
            {FB_CURRENCIES.map((c) => (
              <span key={c} className="font-mono">
                {c}
              </span>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

const QUICK_LINKS = [
  {
    label: 'Graph API Explorer',
    description: 'Interactive API tester',
    url: 'https://developers.facebook.com/tools/explorer/',
  },
  {
    label: 'Ads Manager',
    description: 'Facebook Ads Manager',
    url: 'https://adsmanager.facebook.com/',
  },
  {
    label: 'Business Manager',
    description: 'Facebook Business Suite',
    url: 'https://business.facebook.com/',
  },
  {
    label: 'Text Overlay Checker',
    description: 'Check image text percentage',
    url: 'https://www.facebook.com/ads/tools/text_overlay',
  },
  {
    label: 'Sharing Debugger',
    description: 'Debug Open Graph tags',
    url: 'https://developers.facebook.com/tools/debug/',
  },
  {
    label: 'Account Quality',
    description: 'Check account health',
    url: 'https://www.facebook.com/accountquality',
  },
];

const FB_CURRENCIES = [
  'USD', 'EUR', 'GBP', 'AUD', 'CAD', 'SEK', 'NOK', 'DKK', 'CHF', 'JPY',
  'BRL', 'MXN', 'COP', 'ARS', 'CLP', 'PEN', 'NZD', 'SGD', 'HKD', 'TWD',
  'KRW', 'THB', 'IDR', 'MYR', 'PHP', 'VND', 'INR', 'PKR', 'BDT', 'LKR',
  'ZAR', 'NGN', 'KES', 'GHS', 'EGP', 'MAD', 'TND', 'AED', 'SAR', 'QAR',
  'KWD', 'BHD', 'OMR', 'JOD', 'ILS', 'TRY', 'PLN', 'CZK', 'HUF', 'RON',
  'HRK', 'BGN', 'UAH', 'RUB',
];
