import { useEffect, useCallback } from 'react';
import { useStore } from '../store';
import { sendMessage } from '../lib/utils';
import type { TokenData } from '../lib/types';

export function useToken() {
  const { tokenData, setTokenData, showToast } = useStore();

  const loadToken = useCallback(async () => {
    try {
      const res = await sendMessage<{ tokenData?: TokenData }>({ type: 'GET_TOKEN' });
      setTokenData(res?.tokenData ?? null);
    } catch {
      // Non-critical — token display just stays empty
    }
  }, [setTokenData]);

  useEffect(() => {
    loadToken();

    const handleMessage = (message: { type: string; tokenData?: TokenData }) => {
      switch (message.type) {
        case 'TOKEN_UPDATED':
          if (message.tokenData) setTokenData(message.tokenData);
          break;
        case 'TOKEN_CLEARED':
        case 'TOKEN_EXPIRED':
          setTokenData(null);
          break;
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);
    return () => chrome.runtime.onMessage.removeListener(handleMessage);
  }, [loadToken, setTokenData]);

  const copyToken = useCallback(() => {
    if (!tokenData?.token) return;
    navigator.clipboard
      .writeText(tokenData.token)
      .then(() => showToast('Token copied to clipboard', 'success'))
      .catch(() => showToast('Failed to copy', 'error'));
  }, [tokenData, showToast]);

  const clearToken = useCallback(async () => {
    try {
      await sendMessage({ type: 'CLEAR_TOKEN' });
    } catch { /* ignore */ }
    setTokenData(null);
    showToast('Token cleared', 'info');
  }, [setTokenData, showToast]);

  const setManualToken = useCallback(
    async (token: string) => {
      try {
        const res = await sendMessage<{ ok?: boolean; reason?: string }>({
          type: 'TOKEN_CAPTURED',
          token,
        });
        if (res?.ok) {
          await loadToken();
          showToast('Token saved successfully', 'success');
        } else {
          showToast(
            res?.reason === 'token_expired' ? 'Token appears expired' : 'Invalid token',
            'error'
          );
        }
      } catch {
        showToast('Failed to save token — background service unavailable', 'error');
      }
    },
    [loadToken, showToast]
  );

  const validateToken = useCallback(async () => {
    try {
      const res = await sendMessage<{ valid?: boolean; reason?: string }>({
        type: 'VALIDATE_TOKEN',
      });
      if (res?.valid) {
        showToast('Token is valid', 'success');
        await loadToken();
      } else {
        showToast(`Token invalid: ${res?.reason ?? 'unknown'}`, 'error');
      }
      return res?.valid ?? false;
    } catch {
      showToast('Could not validate — background service unavailable', 'error');
      return false;
    }
  }, [loadToken, showToast]);

  const isExpired = tokenData?.isExpired === true;
  const isStale =
    tokenData ? Date.now() - tokenData.capturedAt > 30 * 24 * 60 * 60 * 1000 : false;
  const hasToken = tokenData !== null && !isExpired;
  const isExpiringSoon =
    tokenData?.expiresAt !== undefined &&
    tokenData.expiresAt > 0 &&
    tokenData.expiresAt - Date.now() < 7 * 86400000;

  return {
    tokenData,
    hasToken,
    isExpired,
    isStale,
    isExpiringSoon,
    copyToken,
    clearToken,
    setManualToken,
    validateToken,
    refresh: loadToken,
  };
}
