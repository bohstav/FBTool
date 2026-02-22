import { AccountStatus, ACCOUNT_STATUS_LABELS } from './types';
import type { AdAccount } from './types';

export function clsxSimple(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

export function maskCardNumber(displayString: string): string {
  // FB returns things like "Visa •••• 4242" — pass through, or extract last 4
  if (!displayString) return '—';
  return displayString;
}

export function isAccountActive(status: number): boolean {
  return status === AccountStatus.ACTIVE;
}

export function isAccountProblematic(status: number): boolean {
  return [
    AccountStatus.DISABLED,
    AccountStatus.UNSETTLED,
    AccountStatus.PENDING_RISK_REVIEW,
  ].includes(status as AccountStatus);
}

export function getTimezoneLabel(tzName: string, offsetHours: number): string {
  const sign = offsetHours >= 0 ? '+' : '';
  const abbr = tzName.split('/').pop()?.replace(/_/g, ' ') ?? tzName;
  return `${abbr} (UTC${sign}${offsetHours})`;
}

export function copyToClipboard(text: string): void {
  navigator.clipboard.writeText(text).catch(() => {
    // Fallback for restricted contexts
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  });
}

export function openInAdsManager(accountId: string): void {
  const numericId = accountId.replace('act_', '');
  const url = `https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=${numericId}`;
  chrome.runtime.sendMessage({ type: 'OPEN_TAB', url });
}

export function stripActPrefix(accountId: string): string {
  return accountId.replace(/^act_/, '');
}

// Wraps chrome.runtime.sendMessage with automatic retries for when the MV3
// service worker is sleeping and needs a moment to wake up.
export async function sendMessage<T = Record<string, unknown>>(
  msg: Record<string, unknown>,
  retries = 2
): Promise<T> {
  for (let i = 0; i <= retries; i++) {
    try {
      return (await chrome.runtime.sendMessage(msg)) as T;
    } catch {
      if (i === retries) throw new Error('Background service unavailable');
      await new Promise((r) => setTimeout(r, 350));
    }
  }
  throw new Error('unreachable');
}

export function computeHealthScore(
  account: AdAccount & { avgDailySpend?: number }
): { score: number; grade: 'A' | 'B' | 'C' | 'D' | 'F'; issues: string[] } {
  let score = 0;
  const issues: string[] = [];

  // Status scoring (+40 / +15 / +0)
  if (account.account_status === AccountStatus.ACTIVE) {
    score += 40;
  } else if (
    account.account_status === AccountStatus.DISABLED ||
    account.account_status === AccountStatus.CLOSED
  ) {
    issues.push('Account disabled or closed');
  } else {
    score += 15;
    issues.push(`Status: ${ACCOUNT_STATUS_LABELS[account.account_status] ?? 'Unknown'}`);
  }

  // Funding source (+20)
  if (account.funding_source_details) {
    score += 20;
  } else {
    issues.push('No payment method on file');
  }

  // Spend cap (+20 / 0)
  const spendCap = parseFloat(account.spend_cap);
  const amountSpent = parseFloat(account.amount_spent);
  if (spendCap > 0) {
    const usedPct = amountSpent / spendCap;
    if (usedPct < 0.8) {
      score += 20;
    } else if (usedPct >= 0.95) {
      issues.push('Spend cap nearly exhausted (>95%)');
    } else {
      issues.push('Spend cap over 80% used');
    }
  }

  // Runway (+20)
  if (account.avgDailySpend !== undefined) {
    const balance = parseFloat(account.balance);
    if (account.avgDailySpend > 0 && balance > 0) {
      const runway = balance / account.avgDailySpend;
      if (runway > 7) {
        score += 20;
      } else {
        issues.push(`Low runway: ~${Math.floor(runway)}d remaining`);
      }
    } else {
      score += 20; // no spending = no runway issue
    }
  }

  let grade: 'A' | 'B' | 'C' | 'D' | 'F';
  if (score >= 80) grade = 'A';
  else if (score >= 60) grade = 'B';
  else if (score >= 40) grade = 'C';
  else if (score >= 20) grade = 'D';
  else grade = 'F';

  return { score, grade, issues };
}

export function debounce<T extends (...args: unknown[]) => void>(fn: T, delay: number): T {
  let timer: ReturnType<typeof setTimeout>;
  return ((...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  }) as T;
}
