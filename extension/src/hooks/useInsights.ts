import { useState, useCallback } from 'react';
import { sendMessage } from '../lib/utils';
import type { InsightsCache } from '../lib/types';

export function useInsights(accountIds: string[]) {
  const [insights, setInsights] = useState<InsightsCache>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(
    async (force = false) => {
      setLoading(true);
      setError(null);
      try {
        const res = await sendMessage<{ insights?: InsightsCache; error?: string }>({
          type: 'FETCH_INSIGHTS',
          accountIds,
          force,
        });
        if (res.error) {
          setError(res.error);
        } else if (res.insights) {
          setInsights(res.insights);
        }
      } catch {
        setError('Failed to fetch insights — background service unavailable');
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [accountIds.join(',')]
  );

  return { insights, loading, error, fetch };
}
