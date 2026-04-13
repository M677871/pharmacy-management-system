import { formatCurrency } from '../../utils/format';

export interface TrendSeries {
  key: string;
  label: string;
  color: string;
}

interface TrendLineChartProps<T extends { label: string }> {
  data: T[];
  series: TrendSeries[];
  height?: number;
}

function buildPath(
  values: number[],
  width: number,
  height: number,
  padding: number,
  maxValue: number,
) {
  return values
    .map((value, index) => {
      const x =
        padding +
        (index / Math.max(values.length - 1, 1)) * (width - padding * 2);
      const y =
        height - padding - (value / Math.max(maxValue, 1)) * (height - padding * 2);
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');
}

export function TrendLineChart<T extends { label: string }>({
  data,
  series,
  height = 240,
}: TrendLineChartProps<T>) {
  const width = 720;
  const padding = 28;
  const numericValues = data.flatMap((point) =>
    series.map((entry) => Number(point[entry.key as keyof typeof point] ?? 0)),
  );
  const maxValue = Math.max(...numericValues, 1);
  const yTicks = [0, maxValue / 2, maxValue];

  return (
    <div className="trend-chart">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Trend chart">
        {yTicks.map((tick, index) => {
          const y =
            height - padding - (tick / Math.max(maxValue, 1)) * (height - padding * 2);
          return (
            <g key={index}>
              <line
                x1={padding}
                y1={y}
                x2={width - padding}
                y2={y}
                className="trend-chart-grid"
              />
              <text x={0} y={y + 4} className="trend-chart-axis">
                {formatCurrency(tick)}
              </text>
            </g>
          );
        })}

        {series.map((entry) => {
          const values = data.map((point) =>
            Number(point[entry.key as keyof typeof point] ?? 0),
          );
          return (
            <path
              key={entry.key}
              d={buildPath(values, width, height, padding, maxValue)}
              stroke={entry.color}
              className="trend-chart-line"
            />
          );
        })}

        {series.map((entry) =>
          data.map((point, index) => {
            const value = Number(point[entry.key as keyof typeof point] ?? 0);
            const x =
              padding +
              (index / Math.max(data.length - 1, 1)) * (width - padding * 2);
            const y =
              height -
              padding -
              (value / Math.max(maxValue, 1)) * (height - padding * 2);

            return (
              <circle
                key={`${entry.key}-${String(point.label)}-${index}`}
                cx={x}
                cy={y}
                r="3.2"
                fill={entry.color}
              />
            );
          }),
        )}
      </svg>

      <div className="trend-chart-labels">
        {data.map((point) => (
          <span key={String(point.label)}>{String(point.label).slice(5)}</span>
        ))}
      </div>
    </div>
  );
}
