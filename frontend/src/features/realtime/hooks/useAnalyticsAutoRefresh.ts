import { useCallback, useEffect, useRef, useState } from 'react';
import { useRealtimeEvent } from './useRealtimeEvent';
import { realtimeEvent, type AnalyticsRefreshEvent } from '../types/realtime.types';

interface UseAnalyticsAutoRefreshOptions {
  scopes: AnalyticsRefreshEvent['scope'][];
  enabled?: boolean;
  debounceMs?: number;
  onRefresh: (payload: AnalyticsRefreshEvent) => Promise<unknown> | unknown;
}

export function useAnalyticsAutoRefresh({
  scopes,
  enabled = true,
  debounceMs = 180,
  onRefresh,
}: UseAnalyticsAutoRefreshOptions) {
  const refreshRef = useRef(onRefresh);
  const timerRef = useRef<number | null>(null);
  const activeRef = useRef(true);
  const inFlightRef = useRef(false);
  const queuedRef = useRef(false);
  const latestEventRef = useRef<AnalyticsRefreshEvent | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastEvent, setLastEvent] = useState<AnalyticsRefreshEvent | null>(null);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string | null>(null);

  useEffect(() => {
    refreshRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    return () => {
      activeRef.current = false;

      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  const markRefreshed = useCallback((timestamp = new Date().toISOString()) => {
    if (!activeRef.current) {
      return;
    }

    setLastRefreshedAt(timestamp);
  }, []);

  async function flushRefresh() {
    const payload = latestEventRef.current;

    if (!payload) {
      return;
    }

    if (inFlightRef.current) {
      queuedRef.current = true;
      return;
    }

    inFlightRef.current = true;

    if (activeRef.current) {
      setIsRefreshing(true);
      setLastEvent(payload);
    }

    try {
      await refreshRef.current(payload);
      markRefreshed();
    } finally {
      inFlightRef.current = false;

      if (activeRef.current) {
        setIsRefreshing(false);
      }

      if (queuedRef.current) {
        queuedRef.current = false;
        window.setTimeout(() => {
          void flushRefresh();
        }, 0);
      }
    }
  }

  useRealtimeEvent(realtimeEvent.analyticsRefresh, (payload) => {
    if (!enabled || !scopes.includes(payload.scope)) {
      return;
    }

    latestEventRef.current = payload;

    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
    }

    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      void flushRefresh();
    }, debounceMs);
  });

  return {
    isRefreshing,
    lastEvent,
    lastRefreshedAt,
    markRefreshed,
  };
}
