# FB Ads Manager Pro — Chrome Extension

Internal tool for managing Facebook Ad Accounts. Combines token extraction, account dashboard, BM management, and utility tools in a Chrome SidePanel.

---

## Quick Start

### 1. Install dependencies

```bash
cd extension
npm install
```

### 2. Build the extension

**Development (with HMR):**
```bash
npm run dev
```

**Production build:**
```bash
npm run build
```

The built extension will be in the `dist/` folder.

### 3. Load in Chrome

1. Open `chrome://extensions`
2. Enable **Developer mode** (top right toggle)
3. Click **Load unpacked**
4. Select the `dist/` folder (after build) — or use CRXJS dev mode for HMR

---

## How Token Capture Works

The extension automatically captures your Meta access token when you visit any `facebook.com` page. It uses two strategies:

1. **Network interception** (MAIN world content script): Overrides `window.fetch` and `XMLHttpRequest` to detect Graph API calls containing `access_token` in the URL.

2. **FB SDK globals**: Reads from `window.FB.getAuthResponse()` and similar page globals when available.

Once captured, the token is validated via `/me` endpoint and stored in `chrome.storage.local`.

**If the token is expired:** Navigate to any `facebook.com` page — the extension will capture a fresh token automatically.

**Manual fallback:** You can paste a token manually in **Settings → Token Management**.

---

## Architecture

```
src/
├── background/
│   └── service_worker.ts      — API calls, token management, message routing
├── content_scripts/
│   ├── interceptor.ts         — Token capture (MAIN world, no chrome.* access)
│   └── inject.ts              — Message bridge + billing page DOM scraper (ISOLATED world)
├── sidebar/
│   ├── App.tsx                — Main sidebar shell with tab routing
│   ├── main.tsx               — React entry point
│   └── index.html             — Sidebar HTML entry
├── popup/
│   ├── Popup.tsx              — Compact quick-view popup
│   └── main.tsx               — React entry point
├── components/
│   ├── AccountCard.tsx        — Single account card view
│   ├── AccountTable.tsx       — Sortable/filterable accounts table
│   ├── Navbar.tsx             — Tab navigation
│   ├── StatusBadge.tsx        — Account status badge
│   └── TokenStatus.tsx        — Token status card with actions
├── pages/
│   ├── Dashboard.tsx          — Stats overview
│   ├── Accounts.tsx           — Full accounts table view
│   ├── BM.tsx                 — Business Manager tab
│   ├── Tools.tsx              — Domain checker, quick links
│   └── Settings.tsx           — Token management, preferences, aliases
├── hooks/
│   ├── useToken.ts            — Token state + actions
│   └── useAccounts.ts         — Accounts + BM data hooks
├── lib/
│   ├── api.ts                 — Graph API v21.0 calls
│   ├── storage.ts             — chrome.storage wrapper
│   ├── types.ts               — TypeScript interfaces & enums
│   └── utils.ts               — Formatting helpers
└── store/
    └── index.ts               — Zustand global state
```

---

## Sidebar Tabs

| Tab | Description |
|-----|-------------|
| **Dashboard** | Token status, account health summary, balances by currency |
| **Accounts** | Searchable/sortable table with inline rename, bulk ID copy, CSV export |
| **BM** | Business managers list with hidden admin detection |
| **Tools** | Domain ban checker, Graph API quick links |
| **Settings** | Token management, aliases, cache interval |

---

## Key Implementation Details

### Data Caching
All account data is cached for **5 minutes** in `chrome.storage.local`. The sidebar shows cached data instantly and only re-fetches on manual refresh or after TTL expiry.

### Account Aliases
Stored in `chrome.storage.sync` — syncs across Chrome profiles automatically. Rename any account in the Accounts table; the original name is preserved and shown as secondary.

### Threshold Scraping
The billing threshold (spend limit) is NOT available via the standard Graph API. The content script monitors Billing Settings pages and extracts the threshold value from the DOM, then stores it with the account cache.

### Hidden Admin Detection
For each Business Manager, the extension compares `/members` (regular users) against `/system_users`. Entries in system_users not in members are considered "hidden" admins.

### Token Error Codes
| Code | Meaning | Action |
|------|---------|--------|
| 190 | Token expired | Visit facebook.com to re-capture |
| 4 / 17 | Rate limited | Wait and retry |
| 200+ | Permission error | Token lacks `ads_read` permission |

---

## Replacing Icons

The included icons are green placeholder squares. Replace them with proper branded icons:

```bash
# Using ImageMagick:
convert -size 16x16 xc:"#00B894" public/icons/icon16.png
convert -size 48x48 xc:"#00B894" public/icons/icon48.png
convert -size 128x128 xc:"#00B894" public/icons/icon128.png
```

Or design proper icons and drop them in `public/icons/`.

---

## Graph API Permissions Required

The extension uses `ads_read` permission scope, which provides:
- `/me/adaccounts` — account list + metadata
- `/me/businesses` — business manager list
- `/{bm_id}/members` — BM members
- `/{bm_id}/system_users` — BM system users
- `/me` — token user info

---

## Development Notes

- **CRXJS plugin** handles extension HMR — run `npm run dev` and load `dist/` in Chrome once; subsequent changes hot-reload automatically.
- **No backend** — everything runs client-side in the extension.
- **Not for Chrome Web Store** — internal use only, load via developer mode.

---

## Tech Stack

- **Manifest V3** Chrome Extension
- **React 18** + **TypeScript** (strict mode)
- **Vite** + **CRXJS** plugin for extension-aware builds
- **Tailwind CSS** (dark mode, custom brand colors)
- **Zustand** for UI state management
- **Meta Graph API v21.0**
