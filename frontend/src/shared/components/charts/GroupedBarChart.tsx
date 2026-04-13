interface GroupedBarChartProps {
  data: Array<{
    label: string;
    first: number;
    second: number;
  }>;
  firstLabel: string;
  secondLabel: string;
}

export function GroupedBarChart({
  data,
  firstLabel,
  secondLabel,
}: GroupedBarChartProps) {
  const maxValue = Math.max(
    ...data.flatMap((item) => [item.first, item.second]),
    1,
  );

  return (
    <div className="grouped-bar-chart">
      <div className="grouped-bar-legend">
        <span>
          <i className="legend-swatch tone-blue" />
          {firstLabel}
        </span>
        <span>
          <i className="legend-swatch tone-green" />
          {secondLabel}
        </span>
      </div>
      <div className="grouped-bar-columns">
        {data.map((item) => (
          <div key={item.label} className="grouped-bar-column">
            <div className="grouped-bar-stack">
              <div
                className="grouped-bar tone-blue"
                style={{ height: `${(item.first / maxValue) * 100}%` }}
              />
              <div
                className="grouped-bar tone-green"
                style={{ height: `${(item.second / maxValue) * 100}%` }}
              />
            </div>
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
