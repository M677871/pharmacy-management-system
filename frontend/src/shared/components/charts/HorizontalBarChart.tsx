interface HorizontalBarChartItem {
  label: string;
  value: number;
  helper?: string;
}

interface HorizontalBarChartProps {
  items: HorizontalBarChartItem[];
  color?: 'blue' | 'green';
}

export function HorizontalBarChart({
  items,
  color = 'blue',
}: HorizontalBarChartProps) {
  const maxValue = Math.max(...items.map((item) => item.value), 1);

  return (
    <div className="horizontal-bars">
      {items.map((item) => (
        <div key={item.label} className="horizontal-bar-row">
          <div className="horizontal-bar-copy">
            <strong>{item.label}</strong>
            {item.helper ? <span>{item.helper}</span> : null}
          </div>
          <div className="horizontal-bar-track">
            <div
              className={`horizontal-bar-fill tone-${color}`}
              style={{ width: `${(item.value / maxValue) * 100}%` }}
            />
          </div>
          <strong className="horizontal-bar-value">{item.value}</strong>
        </div>
      ))}
    </div>
  );
}
