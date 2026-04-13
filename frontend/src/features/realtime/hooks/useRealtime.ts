import { useContext } from 'react';
import { RealtimeContext } from '../context/RealtimeContext';

export function useRealtime() {
  return useContext(RealtimeContext);
}
