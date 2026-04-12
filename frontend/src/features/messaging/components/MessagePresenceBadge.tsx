import type { PresenceEntry, PresenceStatus } from '../../realtime/types/realtime.types';
import {
  getPresenceLabel,
  getPresenceMeta,
  getPresenceTone,
} from '../utils/message-ui';

interface MessagePresenceBadgeProps {
  entry?: PresenceEntry;
  status?: PresenceStatus;
  detail?: string;
  compact?: boolean;
}

export function MessagePresenceBadge({
  entry,
  status,
  detail,
  compact = false,
}: MessagePresenceBadgeProps) {
  const nextStatus = status ?? entry?.status;
  const tone = getPresenceTone(nextStatus);
  const meta = detail ?? getPresenceMeta(entry);

  return (
    <span className={`messages-presence-badge tone-${tone}${compact ? ' compact' : ''}`}>
      <span className="messages-presence-dot" aria-hidden="true" />
      <span>{getPresenceLabel(nextStatus)}</span>
      {!compact ? <small>{meta}</small> : null}
    </span>
  );
}
