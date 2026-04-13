import { formatCompactNumber, formatCurrency } from '../utils/format';
import type { UiTone } from '../../features/dashboard/types/dashboard.types';

interface MetricCardProps {
  label: string;
  value: number | string;
  helper: string;
  tone: UiTone;
}

function renderValue(value: number | string) {
  if (typeof value === 'string') {
    return value;
  }

  if (value >= 1000) {
    return formatCurrency(value);
  }

  return formatCompactNumber(value);
}

export function MetricCard({ label, value, helper, tone }: MetricCardProps) {
  return (
    <article className={`metric-card tone-${tone}`}>
      <div className="metric-card-label">{label}</div>
      <div className="metric-card-value">{renderValue(value)}</div>
      <div className="metric-card-helper">{helper}</div>
    </article>
  );
}
