const DEFAULT_COLORS = [
  '#1b66d1',
  '#27b08b',
  '#ef8a43',
  '#536ce0',
  '#e45d8c',
  '#1aa5a7',
];

interface DonutBreakdownItem {
  label: string;
  value: number;
  helper?: string;
  accent?: string;
  color?: string;
}

interface DonutBreakdownChartProps {
  items: DonutBreakdownItem[];
  centerLabel: string;
  centerValue: string;
  ariaLabel?: string;
  emptyMessage?: string;
}

export function DonutBreakdownChart({
  items,
  centerLabel,
  centerValue,
  ariaLabel = 'Breakdown chart',
  emptyMessage = 'No breakdown data is available yet.',
}: DonutBreakdownChartProps) {
  const visibleItems = items
    .filter((item) => item.value > 0)
    .map((item, index) => ({
      ...item,
      color: item.color ?? DEFAULT_COLORS[index % DEFAULT_COLORS.length],
    }));

  if (!visibleItems.length) {
    return <div className="surface-empty">{emptyMessage}</div>;
  }

  const size = 176;
  const strokeWidth = 18;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = visibleItems.reduce((sum, item) => sum + item.value, 0);
  let offset = 0;

  return (
    <div className="donut-breakdown">
      <div className="donut-breakdown-visual">
        <svg viewBox={`0 0 ${size} ${size}`} role="img" aria-label={ariaLabel}>
          <circle
            className="donut-breakdown-track"
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth}
          />
          {visibleItems.map((item) => {
            const segmentLength = (item.value / total) * circumference;
            const segment = (
              <circle
                key={item.label}
                className="donut-breakdown-segment"
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke={item.color}
                strokeWidth={strokeWidth}
                strokeDasharray={`${segmentLength} ${circumference}`}
                strokeDashoffset={-offset}
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
              />
            );

            offset += segmentLength;
            return segment;
          })}
        </svg>

        <div className="donut-breakdown-center">
          <strong>{centerValue}</strong>
          <span>{centerLabel}</span>
        </div>
      </div>

      <div className="donut-breakdown-legend">
        {visibleItems.map((item) => (
          <div key={item.label} className="donut-breakdown-row">
            <div className="donut-breakdown-copy">
              <span
                className="donut-breakdown-swatch"
                style={{ background: item.color }}
              />
              <div>
                <strong>{item.label}</strong>
                {item.helper ? <span>{item.helper}</span> : null}
              </div>
            </div>

            {item.accent ? (
              <strong className="donut-breakdown-accent">{item.accent}</strong>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
