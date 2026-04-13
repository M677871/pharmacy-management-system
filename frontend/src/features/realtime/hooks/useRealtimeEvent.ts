import { useEffect, useRef } from 'react';
import { useRealtime } from './useRealtime';
import type { RealtimeEventMap } from '../types/realtime.types';

export function useRealtimeEvent<TEvent extends keyof RealtimeEventMap>(
  event: TEvent,
  listener: (payload: RealtimeEventMap[TEvent]) => void,
) {
  const { subscribe } = useRealtime();
  const listenerRef = useRef(listener);

  useEffect(() => {
    listenerRef.current = listener;
  }, [listener]);

  useEffect(
    () =>
      subscribe(event, (payload) => {
        listenerRef.current(payload);
      }),
    [event, subscribe],
  );
}
